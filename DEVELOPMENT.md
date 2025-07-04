# Development Guide

## Getting Started

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **PostgreSQL 14+** - Primary database
- **npm or yarn** - Package manager
- **Git** - Version control

### Initial Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd taskmed-platform
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/taskmed
PGHOST=localhost
PGPORT=5432
PGUSER=taskmed_user
PGPASSWORD=your_password
PGDATABASE=taskmed

# Session Security
SESSION_SECRET=your-super-secure-session-secret-here

# External API Keys
ASAAS_API_KEY=your-asaas-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Application Environment
NODE_ENV=development
```

3. **Database Setup**
```bash
# Create database
createdb taskmed

# Push schema to database
npm run db:push

# Verify connection
npm run db:studio  # Opens Drizzle Studio
```

4. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Development Workflow

### Code Organization

**Frontend Structure:**
```
client/src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui component library
│   ├── Header.tsx      # Application header
│   ├── Layout.tsx      # Main layout wrapper
│   └── Sidebar.tsx     # Navigation sidebar
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication hook
│   ├── use-toast.ts    # Toast notifications
│   └── use-mobile.tsx  # Mobile detection
├── lib/                # Utility functions
│   ├── queryClient.ts  # TanStack Query configuration
│   ├── utils.ts        # General utilities
│   └── authUtils.ts    # Authentication utilities
├── pages/              # Route components
│   ├── dashboard.tsx   # Main dashboard
│   ├── contatos.tsx    # Contact management
│   ├── financeiro.tsx  # Financial module
│   └── ...
└── App.tsx             # Root application component
```

**Backend Structure:**
```
server/
├── asaas-service.ts    # Asaas payment integration
├── auth.ts             # Authentication configuration
├── db.ts               # Database connection
├── postgres-storage.ts # Database operations
├── routes.ts           # API route definitions
├── storage.ts          # Storage interface
└── index.ts            # Server entry point
```

### Development Commands

```bash
# Development server with hot reload
npm run dev

# Database operations
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations
npm run db:studio        # Open database studio

# Code quality
npm run lint             # ESLint checking
npm run type-check       # TypeScript validation
npm run format           # Prettier formatting

# Testing
npm run test             # Run test suite
npm run test:watch       # Watch mode testing
npm run test:coverage    # Coverage reporting

# Production build
npm run build            # Build for production
npm run start            # Start production server
```

## Adding New Features

### 1. Creating a New Page

**Step 1: Create Page Component**
```typescript
// client/src/pages/new-feature.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewFeaturePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/new-feature"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">New Feature</h1>
      {/* Feature content */}
    </div>
  );
}
```

**Step 2: Add Route**
```typescript
// client/src/App.tsx
import NewFeaturePage from "./pages/new-feature";

// Add to route list
<Route path="/new-feature" component={NewFeaturePage} />
```

**Step 3: Add Navigation**
```typescript
// client/src/components/Sidebar.tsx
const navigation = [
  // ... existing items
  { name: "New Feature", href: "/new-feature", icon: FeatureIcon, route: "new-feature" },
];
```

### 2. Adding Database Tables

**Step 1: Define Schema**
```typescript
// shared/schema.ts
export const newFeatureTable = pgTable("new_feature", {
  id: serial("id").primaryKey(),
  clinic_id: integer("clinic_id").references(() => clinics.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type NewFeature = typeof newFeatureTable.$inferSelect;
export type InsertNewFeature = typeof newFeatureTable.$inferInsert;
```

**Step 2: Add Storage Interface**
```typescript
// server/storage.ts
interface IStorage {
  // ... existing methods
  getNewFeatures(clinicId: number): Promise<NewFeature[]>;
  createNewFeature(feature: InsertNewFeature): Promise<NewFeature>;
  updateNewFeature(id: number, updates: Partial<InsertNewFeature>): Promise<NewFeature | undefined>;
}
```

**Step 3: Implement Storage Methods**
```typescript
// server/postgres-storage.ts
async getNewFeatures(clinicId: number): Promise<NewFeature[]> {
  return await db.select()
    .from(newFeatureTable)
    .where(eq(newFeatureTable.clinic_id, clinicId))
    .orderBy(desc(newFeatureTable.created_at));
}

async createNewFeature(feature: InsertNewFeature): Promise<NewFeature> {
  const [newFeature] = await db.insert(newFeatureTable)
    .values(feature)
    .returning();
  return newFeature;
}
```

**Step 4: Add API Routes**
```typescript
// server/routes.ts
app.get('/api/new-feature', isAuthenticated, hasClinicAccess(), async (req: any, res) => {
  try {
    const clinicId = req.user.clinicId;
    const features = await storage.getNewFeatures(clinicId);
    res.json(features);
  } catch (error) {
    console.error("Error fetching features:", error);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

app.post('/api/new-feature', isAuthenticated, hasClinicAccess(), async (req: any, res) => {
  try {
    const clinicId = req.user.clinicId;
    const featureData = { ...req.body, clinic_id: clinicId };
    const feature = await storage.createNewFeature(featureData);
    res.status(201).json(feature);
  } catch (error) {
    console.error("Error creating feature:", error);
    res.status(500).json({ error: "Failed to create feature" });
  }
});
```

**Step 5: Push Schema Changes**
```bash
npm run db:push
```

### 3. Adding External API Integrations

**Step 1: Create Service Class**
```typescript
// server/new-api-service.ts
export class NewApiService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NEW_API_KEY || '';
    this.baseUrl = process.env.NEW_API_URL || 'https://api.example.com';
  }

  private async makeRequest<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getData(id: string): Promise<any> {
    return this.makeRequest(`/data/${id}`);
  }
}

export const newApiService = new NewApiService();
```

**Step 2: Add to Routes**
```typescript
// server/routes.ts
import { newApiService } from './new-api-service';

app.get('/api/external-data/:id', isAuthenticated, async (req, res) => {
  try {
    const data = await newApiService.getData(req.params.id);
    res.json(data);
  } catch (error) {
    console.error("External API error:", error);
    res.status(500).json({ error: "Failed to fetch external data" });
  }
});
```

## Testing Guidelines

### Unit Testing

**Testing Components:**
```typescript
// client/src/components/__tests__/Header.test.tsx
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

describe('Header Component', () => {
  it('renders user menu when authenticated', () => {
    render(<Header />);
    expect(screen.getByText('User Menu')).toBeInTheDocument();
  });
});
```

**Testing API Routes:**
```typescript
// server/__tests__/routes.test.ts
import request from 'supertest';
import { app } from '../index';

describe('/api/contacts', () => {
  it('should return contacts for authenticated user', async () => {
    const response = await request(app)
      .get('/api/contacts')
      .set('Cookie', ['session=valid_session'])
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

### Integration Testing

**Database Testing:**
```typescript
// server/__tests__/storage.test.ts
import { PostgreSQLStorage } from '../postgres-storage';

describe('Contact Storage', () => {
  let storage: PostgreSQLStorage;

  beforeEach(() => {
    storage = new PostgreSQLStorage();
  });

  it('should create and retrieve contact', async () => {
    const newContact = {
      clinic_id: 1,
      name: 'Test Patient',
      phone: '(11) 99999-9999'
    };

    const created = await storage.createContact(newContact);
    const retrieved = await storage.getContact(created.id);

    expect(retrieved?.name).toBe('Test Patient');
  });
});
```

## Code Style Guidelines

### TypeScript Best Practices

**Interface Definitions:**
```typescript
// Prefer interfaces for object shapes
interface ContactFormData {
  name: string;
  phone: string;
  email?: string;
}

// Use type for unions and computed types
type ContactStatus = 'novo' | 'ativo' | 'inativo';
type ContactWithAppointments = Contact & {
  appointments: Appointment[];
};
```

**Component Props:**
```typescript
interface ContactCardProps {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  showActions?: boolean;
}

export function ContactCard({ contact, onEdit, showActions = true }: ContactCardProps) {
  // Component implementation
}
```

**API Response Types:**
```typescript
// Define response shapes
interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### React Best Practices

**Custom Hooks:**
```typescript
// Extract reusable logic into custom hooks
function useContacts(filters?: ContactFilters) {
  return useQuery({
    queryKey: ["/api/contacts", filters],
    queryFn: getQueryFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function useContactMutations() {
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating contact", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return { createMutation };
}
```

**Form Handling:**
```typescript
// Use React Hook Form with Zod validation
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Invalid email").optional(),
});

function ContactForm({ initialData, onSubmit }: ContactFormProps) {
  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: initialData || {
      name: "",
      phone: "",
      email: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Other fields */}
      </form>
    </Form>
  );
}
```

### Database Best Practices

**Query Optimization:**
```typescript
// Use indexes for commonly queried fields
const contacts = await db.select()
  .from(contacts)
  .where(
    and(
      eq(contacts.clinic_id, clinicId),
      ilike(contacts.name, `%${search}%`)
    )
  )
  .orderBy(desc(contacts.created_at))
  .limit(pageSize)
  .offset(page * pageSize);
```

**Transaction Handling:**
```typescript
// Use transactions for related operations
async function createAppointmentWithCharge(appointmentData: InsertAppointment, chargeData: InsertCharge) {
  return await db.transaction(async (tx) => {
    const [appointment] = await tx.insert(appointments)
      .values(appointmentData)
      .returning();

    const [charge] = await tx.insert(charges)
      .values({
        ...chargeData,
        appointment_id: appointment.id,
      })
      .returning();

    return { appointment, charge };
  });
}
```

## Debugging and Troubleshooting

### Common Issues

**Database Connection Problems:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U taskmed_user -d taskmed

# Check environment variables
echo $DATABASE_URL
```

**Authentication Issues:**
```typescript
// Debug session middleware
app.use(session({
  // ... config
  cookie: {
    secure: false,  // Set to false for development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Add debug logging
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  next();
});
```

**API Request Failures:**
```typescript
// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Handle errors gracefully
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

### Development Tools

**Database Inspection:**
```bash
# Open Drizzle Studio
npm run db:studio

# Direct PostgreSQL access
psql $DATABASE_URL

# View table structure
\d contacts
\d+ appointments
```

**API Testing:**
```bash
# Test with curl
curl -X GET http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Test with Postman/Insomnia
# Create collection with authentication setup
```

**Frontend Debugging:**
```typescript
// React Query DevTools (add to App.tsx)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

This development guide provides comprehensive instructions for setting up, developing, and maintaining the Taskmed healthcare management platform.