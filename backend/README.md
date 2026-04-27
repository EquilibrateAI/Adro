# adro-offline-backend

A Python-based backend service for the Adro offline application.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Code Style](#code-style)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- Python 3.8+
- pip

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Gagan-s1mple/adro-offline-backend.git
   cd adro-offline-backend
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Usage

```bash
python main.py
```

## Code Style

This project follows [PEP 8](https://peps.python.org/pep-0008/) — the official Python style guide.

Key conventions used throughout the codebase:

- **Indentation**: 4 spaces per indentation level (no tabs).
- **Line length**: Maximum 79 characters per line.
- **Blank lines**: Two blank lines around top-level functions and classes; one blank line between methods inside a class.
- **Imports**: One import per line, grouped in the following order:
  1. Standard library imports
  2. Related third-party imports
  3. Local application/library imports

  Each group is separated by a blank line.
- **Naming conventions**:
  - `snake_case` for variables, functions, and module names.
  - `PascalCase` (CapWords) for class names.
  - `UPPER_CASE` for constants.
- **Docstrings**: All public modules, functions, classes, and methods include docstrings following [PEP 257](https://peps.python.org/pep-0257/).
- **Whitespace**: Avoid extraneous whitespace inside brackets, before commas, or before colons.
- **Type hints**: Encouraged for function signatures in accordance with [PEP 484](https://peps.python.org/pep-0484/).

### Linting

To check code style locally, install and run `pycodestyle` (formerly `pep8`):

```bash
pip install pycodestyle
pycodestyle .
```

Or use `flake8` for a broader set of checks (style + common errors):

```bash
pip install flake8
flake8 .
```

Auto-format code with `autopep8`:

```bash
pip install autopep8
autopep8 --in-place --recursive .
```

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "Add your feature"`.
4. Push to your branch: `git push origin feature/your-feature`.
5. Open a pull request.

Please ensure all code follows the PEP 8 style guidelines described above before submitting a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
