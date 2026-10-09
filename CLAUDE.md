# Extreme Sudoku

Веб-судоку только с экстремально сложными задачами, для игры с iPhone, хостинг на GitHub Pages.

## Правила (обязательны)

- НИКАКИХ ЭМОДЗИ: ни в ответах, ни в коде, ни в комментариях, ни в сообщениях коммитов, ни в документации.
- Никогда не добавлять в сообщения коммитов и описания PR строку `Co-Authored-By: Claude ...` или любые другие упоминания соавторства Claude.
- Общение с пользователем на русском языке.

## Текущее состояние

Проект на стадии проектирования, кода ещё нет. Дизайн утверждён по секциям и записан в спек
[docs/superpowers/specs/2026-10-09-extreme-sudoku-design.md](docs/superpowers/specs/2026-10-09-extreme-sudoku-design.md).
Спек утверждён. План реализации: [docs/superpowers/plans/2026-10-09-extreme-sudoku-plan.md](docs/superpowers/plans/2026-10-09-extreme-sudoku-plan.md), ожидает утверждения. История решений:
[docs/brainstorm-handoff.md](docs/brainstorm-handoff.md).

Порядок работы: утвердить дизайн по секциям, затем письменный спек, затем план реализации, затем код.
Не начинать писать код продукта, пока пользователь не утвердил спек и план.

## Порядок исполнения плана

Каждый этап плана делается в своей ветке и оформляется PR в `main`. Пользователь PR не смотрит:
как только CI зелёный, PR вливается в `main` без дополнительного подтверждения.

## Команды

- `npm run dev` - локальный сервер разработки
- `npm test` - unit и компонентные тесты (Vitest)
- `npm run typecheck` - проверка типов
- `npm run format` / `npm run format:check` - Prettier
- `npm run build` - production-сборка в `dist/`
- `npm run e2e` - Playwright smoke-тесты
- `npm run generate` - генерация банка задач
- `npm run verify-bank` - полная проверка банка

## Структура

- `src/engine` - решатель, рейтинг, трансформации; без DOM, используется и в браузере, и в Node
- `src/game` - логика партии; зависит только от `engine`
- `src/app` - интерфейс на Preact
- `src/data/puzzles.json` - банк задач
- `scripts` - генератор и проверка банка (Node)
- `tests` - Vitest, `e2e` - Playwright
