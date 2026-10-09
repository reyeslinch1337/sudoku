# Extreme Sudoku

Веб-судоку только с экстремально сложными задачами, для игры с iPhone, хостинг на GitHub Pages.

## Правила (обязательны)

- НИКАКИХ ЭМОДЗИ: ни в ответах, ни в коде, ни в комментариях, ни в сообщениях коммитов, ни в документации.
- Никогда не добавлять в сообщения коммитов и описания PR строку `Co-Authored-By: Claude ...` или любые другие упоминания соавторства Claude.
- Общение с пользователем на русском языке.

## Текущее состояние

Игра реализована по спеку [docs/superpowers/specs/2026-10-09-extreme-sudoku-design.md](docs/superpowers/specs/2026-10-09-extreme-sudoku-design.md)
и плану [docs/superpowers/plans/2026-10-09-extreme-sudoku-plan.md](docs/superpowers/plans/2026-10-09-extreme-sudoku-plan.md).
Сайт: https://reyeslinch1337.github.io/sudoku/ (публикуется GitHub Actions при каждом push в `main`).
История решений: [docs/brainstorm-handoff.md](docs/brainstorm-handoff.md).

## Как обновить банк задач

1. `npm run generate -- --seed N` (новый seed даёт новый банк; состояние в `.generate-state/`, прерванный запуск продолжается).
2. `npm run verify-bank`.
3. Закоммитить `src/data/puzzles.json`. Статистика игроков привязана к строке задачи, поэтому смена банка её не ломает.

Иконки: исходник `public/icon.svg`, PNG пересобираются командой `npm run icons`.

## Порядок исполнения плана

Каждый этап плана делается в своей ветке и оформляется PR в `main`. Пользователь PR не смотрит:
как только CI зелёный, PR вливается в `main` без дополнительного подтверждения.

## Команды

- `npm run dev` - локальный сервер разработки
- `npm test` - unit и компонентные тесты (Vitest)
- `npm run typecheck` - проверка типов
- `npm run format` / `npm run format:check` - Prettier
- `npm run build` - production-сборка в `dist/`
- `npm run e2e` - Playwright smoke-тесты (локально с предустановленным Chromium: `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e`)
- `npm run generate` - генерация банка задач
- `npm run verify-bank` - полная проверка банка

## Структура

- `src/engine` - решатель, рейтинг, трансформации; без DOM, используется и в браузере, и в Node
- `src/game` - логика партии; зависит только от `engine`
- `src/app` - интерфейс на Preact
- `src/data/puzzles.json` - банк задач
- `scripts` - генератор и проверка банка (Node)
- `tests` - Vitest, `e2e` - Playwright
