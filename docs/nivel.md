# Cómo se calcula el nivel

El nivel de cada jugador (escala 1.0–10.0) empieza con la autoevaluación y luego cambia con cada partido por dos vías independientes:

1. **El resultado** (Elo por equipos): se aplica al guardar el acta del partido.
2. **Las notas** (bonus de valoraciones): se aplica 48 h después, cuando se cierran las notas.

El cambio total de un partido es la suma de los dos. Ambos quedan guardados por separado en `rating_history` (`source = 'match_result'` y `source = 'ratings'`), así que corregir un acta puede deshacerlos con exactitud.

Código: `src/lib/domain/elo.ts` y `src/lib/domain/rating-bonus.ts` (funciones puras, con tests).

## 1. El resultado: Elo por equipos (PRD §5.5)

Cada jugador gana o pierde según si a su equipo le fue mejor o peor de lo **esperado**:

| Paso | Fórmula | Qué significa |
|---|---|---|
| Fuerza de cada equipo | `R_A`, `R_B` = media de nivel de sus jugadores | Equipos desiguales en número no importan: se usa la media |
| Resultado esperado | `E_A = 1 / (1 + 10^((R_B − R_A) / 4))` | Probabilidad de que gane A (0 a 1). `E_B = 1 − E_A` |
| Resultado real | `S_A` = 1 si gana A, 0.5 empate, 0 si pierde | |
| Peso de la goleada | `M = 1 + ln(1 + |diferencia de goles|) / 3` | 1 gol → ×1.23, 3 goles → ×1.46 |
| Cambio por jugador | `Δ = K · M · (S − E)` | `K = 0.30`, o `0.60` mientras el nivel es provisional (primeros 5 partidos) |

Todos los jugadores de un mismo equipo reciben el mismo Δ (salvo los provisionales, que reciben el doble). El nivel nunca sale de 1.0–10.0.

**Consecuencia clave:** quien gana **nunca pierde** puntos por el resultado (`S − E` siempre es positivo), pero el favorito gana poco y la sorpresa se premia mucho.

### Ejemplos

| Partido | E del equipo A | Cambio equipo A | Cambio equipo B |
|---|---|---|---|
| Iguales (6.0 vs 6.0), gana A 4–3 | 0.50 | **+0.18** | −0.18 |
| Favorito (8.0 vs 5.5), gana A 2–1 | 0.81 | **+0.07** | −0.07 |
| Lo mismo, jugador provisional en A | 0.81 | **+0.14** | |
| Sorpresa (8.0 vs 5.5), gana B 1–0 | 0.81 | −0.30 | **+0.30** |
| Empate entre desiguales (8.0 vs 5.5), 2–2 | 0.81 | −0.09 | **+0.09** |

Detalle del favorito que gana 2–1: `E_A = 1 / (1 + 10^(−2.5/4)) = 1 / (1 + 0.237) = 0.808`; `M = 1 + ln(2)/3 = 1.231`; `Δ = 0.30 × 1.231 × (1 − 0.808) = +0.07`.

## 2. Las notas: bonus de valoraciones (fase 2c)

Tras el partido, cualquiera del grupo puede poner nota (0–10, de medio en medio punto) a quien jugó, durante **48 h desde que se guarda el acta**. Al cerrarse:

| Regla | Detalle |
|---|---|
| Fórmula | `bonus = 0.08 × (tu media − media del partido)` |
| Límite | máximo **±0.15** por partido |
| Qué notas cuentan | solo las de **otros** jugadores (la tuya propia se ignora para el nivel) |
| Mínimo | necesitas **3 o más** notas para tener bonus |
| Media del partido | la media de las medias de los jugadores con bonus (hacen falta al menos 2) |

**Consecuencia clave:** el bonus es **relativo al partido**, no absoluto. Un 7 es «buena nota» solo si los demás sacaron menos. Así da igual que un grupo puntúe generoso y otro duro.

Ejemplo con tu media en 7:

| Media del partido | Bonus |
|---|---|
| 6.0 | +0.08 |
| 6.5 | +0.04 |
| 7.0 | 0 |
| 7.5 | −0.04 |
| 8.0 | −0.08 |
| 8.5 | −0.12 |

## 3. Juntando las dos: ¿puedo perder nivel aunque gane?

Sí, pero solo en un caso concreto: si eras el **gran favorito** (el resultado aporta poco) y además tu nota quedó **claramente por debajo** de la media del partido.

Supón que tu equipo tiene media 8.0, el rival 5.5, ganáis 2–1 y tu media de notas es 7:

| Media del partido | Resultado | Notas | **Total** |
|---|---|---|---|
| 6.0 | +0.07 | +0.08 | **+0.15** |
| 6.5 | +0.07 | +0.04 | **+0.11** |
| 7.0 | +0.07 | 0 | **+0.07** |
| 7.5 | +0.07 | −0.04 | **+0.03** |
| 8.0 | +0.07 | −0.08 | **−0.01** |
| 8.5 | +0.07 | −0.12 | **−0.05** |

Para que un favorito que gana por 1 gol pierda puntos, su media tiene que quedar unos **0.9 puntos por debajo** de la del partido. El peor caso posible es `+0.07 − 0.15 = −0.08`. Cuanto más igualados los equipos, más aporta ganar y más difícil es acabar en negativo:

| Tu equipo vs 5.5, ganáis por 1 | Resultado | Pierdes nivel si tu media queda por debajo de la del partido en más de… |
|---|---|---|
| 8.0 | +0.07 | 0.9 |
| 7.0 | +0.11 | 1.4 |
| 6.5 | +0.13 | 1.7 |

Es coherente con la idea: ganar un partido que se esperaba ganar, siendo de los peor valorados del campo, cuenta como un rendimiento algo por debajo de lo esperado, y el cambio es muy pequeño.

## 4. Correcciones y cierres

- **Corregir un acta** deshace el resultado y el bonus de **ese** partido (no recalcula partidos posteriores), aplica el nuevo resultado y **reabre las notas** otras 48 h.
- El cierre de notas y el bonus se aplican al abrir la app y en el cron diario (`closeDueRatings`), así que no dependen de la hora del cron.
- El bonus no cambia el número de partidos jugados (eso solo lo hace el resultado), así que no afecta a cuándo deja de ser provisional el nivel.
