# Contributing to Adro

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

### 1. Finding Issues to Work On

- Check the [issue tracker](https://github.com/yourusername/adro/issues) for open issues
- Look for issues labeled `good first issue` for beginners
- Comment on an issue to let others know you're working on it
- Don't start work without commenting - someone might already be fixing it

### 2. Setting Up Your Environment

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/yourusername/adro.git
cd adro

# Add the original repository as upstream
git remote add upstream https://github.com/originalowner/adro.git

# Install dependencies
npm install

# Create a new branch for your work
git checkout -b feature/your-feature-name
```

### 3. Running the Development Server

```bash
# Next.js development
npm run dev

# Or with Tauri (full stack)
npm run tauri dev
```

### 4. Building for Production

```bash
# Build Next.js
npm run build

# Build Tauri app
npm run tauri build
```

---

## We Develop with Github

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Report bugs using Github's issues

We use GitHub issues to track public bugs. Report a bug by opening a new issue; it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

---

## Coding Standards

### Project Structure

```
adro/
├── app/                    # Next.js App Router pages
│   ├── data/              # Data management routes
│   ├── dashboard/         # Dashboard routes
│   └── modeling/          # Modeling routes
├── components/            # React components
│   ├── data/             # Data-related components
│   ├── dashboard/        # Dashboard components
│   └── modeling/         # Modeling components
├── services/             # API and business logic
│   ├── api/              # Low-level API client functions
│   └── utils/            # High-level utilities and stores
│       └── dashboard/    # Dashboard stores and helpers
├── types/                # TypeScript type definitions
├── public/               # Static assets
└── styles/              # Global styles
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DataSidebar.tsx` |
| Hooks | camelCase with `use` prefix | `useChatStore.ts` |
| Utils | camelCase | `fetchDataSources.ts` |
| Types/Interfaces | PascalCase | `ChartData` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Files (general) | kebab-case | `chart-config.ts` |

### File Organization

- **Keep related files together**: Component, types, and utils in same folder
- **Use descriptive names**: `data-sidebar.tsx`, not `sidebar.tsx` or `Side.tsx`
- **Export components as named exports**: `export const DataSidebar = ...`
- **One export per file preferred**: Makes imports clearer
- **Index files for clean imports**: Use `index.ts` for barrel exports

### Directory Structure Best Practices

```
components/
├── dashboard/
│   ├── chart/
│   │   ├── chart.tsx
│   │   ├── chart-config.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── interface/
│   │   └── interface.tsx
│   └── dashboard.tsx
```

### TypeScript Guidelines

```typescript
// Good: Explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

// Good: Interface for object shapes
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// Good: Type for unions
type Theme = 'light' | 'dark' | 'system';

// Avoid: any type
// Bad: const data: any = response

// Good: Proper typing
const data = response as unknown as ApiResponse<User>;

// Better: Type guards
function isApiResponse(response: unknown): response is ApiResponse<User> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response &&
    'status' in response
  );
}
```

### React/Next.js Patterns

#### Functional Components

```typescript
// Good: Clean functional component
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, variant = 'primary' }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {label}
    </button>
  );
};
```

#### Custom Hooks

```typescript
// Good: Extract logic into custom hooks
function useDataFetcher(url: string) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
```

#### Error Handling

```typescript
// Good: Proper error boundaries
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

#### Loading States

```typescript
// Good: Proper loading and error states
function DataComponent() {
  const { data, loading, error } = useDataFetcher('/api/data');

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!data) return <EmptyState />;

  return <DataList items={data} />;
}
```

### Styling

#### CSS/Tailwind

```typescript
// Good: Semantic class names
<div className="data-table-container">
  <table className="data-table">
    ...
  </table>
</div>

// Good: Use CSS variables for theme
<div className="btn-primary" style={{ '--primary-color': '#007bff' }}>
  Click me
</div>

// Avoid: Inline styles (except dynamic)
// Unless absolutely necessary
```

#### CSS Modules

```typescript
// For scoped styles, use CSS modules
import styles from './Button.module.css';

<button className={styles.button}>Click</button>
```

### State Management (Zustand)

```typescript
// Good: Well-typed Zustand store
import { create } from 'zustand';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}));
```

#### Using Selectors

```typescript
// Good: Use selectors to prevent unnecessary re-renders
const messageCount = useChatStore((state) => state.messages.length);
```

### API Integration

```typescript
// Good: Typed API helpers
interface FetchDataSourcesResponse {
  sources: DataSource[];
}

export async function fetchDataSources(): Promise<FetchDataSourcesResponse> {
  const response = await fetch('/data_sources_info/datasources-metadata');

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  return response.json();
}

// Good: Using the API helper with error handling
async function loadSources() {
  try {
    setLoading(true);
    const { sources } = await fetchDataSources();
    setSources(sources);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
}
```

### Performance

#### Memoization

```typescript
// Use React.memo for expensive components
const ExpensiveChart = React.memo(function ExpensiveChart({ data }) {
  return <ChartRenderer data={data} />;
});

// UseuseMemo for expensive calculations
const processedData = useMemo(() => {
  return data.map(item => transformItem(item));
}, [data]);

// Use useCallback for callback stability
const handleClick = useCallback((id: string) => {
  console.log(id);
}, []);
```

#### Lazy Loading

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./components/dashboard'));

// Lazy load components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

#### Debouncing

```typescript
// Debounce search inputs
import { useDebouncedCallback } from 'use-debounce';

function SearchComponent() {
  const [query, setQuery] = useState('');

  const debouncedSearch = useDebouncedCallback((value) => {
    fetchResults(value);
  }, 300);

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        debouncedSearch(e.target.value);
      }}
    />
  );
}
```

### Accessibility

#### Semantic HTML

```typescript
// Good: Semantic HTML
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Title</h1>
    <p>Content</p>
  </article>
</main>

<footer>Copyright</footer>
```

#### ARIA Attributes

```typescript
// Good: Proper ARIA
<button
  aria-label="Close dialog"
  aria-describedby="dialog-description"
>
  <CloseIcon />
</button>

<input
  aria-invalid={hasError}
  aria-describedby="error-message"
/>

<span role="alert" aria-live="polite">
  {errorMessage}
</span>
```

#### Focus Management

```typescript
// Good: Focus management for modals
function Modal({ onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### File and Folder Organization Patterns

#### Feature-Based Folders

```
# Group by feature, not by type
components/
├── data/
│   ├── sidebar/
│   │   ├── data-sidebar.tsx
│   │   ├── data-sidebar.types.ts
│   │   └── index.ts
│   ├── table/
│   │   └── data-table.tsx
│   └── upload/
│       └── file-upload.tsx
���── dashboard/
│   ├── interface/
│   │   └── interface.tsx
│   └── chart/
│       └── chart.tsx
└── modeling/
    ├── predict/
    │   └── predict.tsx
    └── optimize/
        └── optimize.tsx
```

#### Service Organization

```
services/
├── data/
│   ├── fetch-data-sources.ts
│   ├── get-column-info.ts
│   └── table-operations.ts
├── dashboard/
│   ├── chat.ts
│   └── chart.ts
└── modeling/
    ├── predictor.ts
    └── optimizer.ts
```

---

## Git Workflow

### Commit Messages

Use conventional commits:

```
feat: add new data source support
fix: resolve column loading issue
docs: update README
style: format code
refactor: simplify API response handling
test: add tests for predictor
chore: update dependencies
```

### Branch Naming

| Type | Example | Use Case |
|------|---------|----------|
| feature/ | `feature/add-data-export` | New features |
| bugfix/ | `bugfix/fix-upload-error` | Bug fixes |
| hotfix/ | `hotfix/security-patch` | Urgent production fixes |
| refactor/ | `refactor/api-cleanup` | Code refactoring |
| docs/ | `docs/update-api-docs` | Documentation |
| test/ | `test/add-integration-tests` | Adding tests |

### Workflow Steps

```bash
# 1. Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Make changes and commit
git add .
git commit -m "feat: description"

# 4. Keep your branch updated
git fetch upstream
git rebase upstream/main

# 5. Push to your fork
git push origin feature/your-feature

# 6. Create PR on GitHub
```

### Handling Conflicts

```bash
# During rebase
git fetch upstream
git rebase upstream/main

# If conflicts occur
# Fix conflicts in your editor
git add .
git rebase --continue

# If you want to abort
git rebase --abort
```

### Code Review Guidelines

**As a reviewer:**
- Review within 24 hours
- Be constructive and specific
- Approve if changes look good, even if not perfect
- Don't block on stylistic nits (use linter instead)

**As a contributor:**
- Keep PRs small (< 400 lines)
- Respond to feedback promptly
- Don't take feedback personally
- Ask for clarification if needed

---

## Pull Request Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe testing done

## Screenshots
If UI changes

## Checklist
- [ ] Tests pass
- [ ] Code follows style guide
- [ ] Documentation updated
```

---

## Testing Guidelines

### Unit Tests

```typescript
// Using Jest
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click', () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Test API integration
import { fetchDataSources } from './services/data';

describe('API Integration', () => {
  it('fetches data sources', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sources: [] }),
    });

    const result = await fetchDataSources();
    expect(result.sources).toEqual([]);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Documentation

### Code Comments

```typescript
// Good: Explain WHY, not WHAT
// Retry with exponential backoff to handle temporary network issues
async function fetchWithRetry(url: string, attempts = 3) {
  // ... implementation
}

// Bad: Redundant comments
// This function fetches data
function fetchData() { }
```

### README Updates

When adding new features, update README:
- Add to feature section
- Document API endpoints used
- Update architecture diagrams

---

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.