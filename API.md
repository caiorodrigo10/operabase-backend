# API Documentation

## Authentication

The TaskMed API supports two authentication methods:

### 1. Session-Based Authentication (Web Application)
For web interface access, authentication is handled via session cookies.

### 2. API Key Authentication (N8N/Automation)
For external integrations and automation tools, authentication uses API Keys with Bearer tokens.

**Format:**
```http
Authorization: Bearer tk_clinic_{CLINIC_ID}_{32_HEX_CHARS}
```

**Example:**
```http
Authorization: Bearer tk_clinic_1_45ce00c0e7236e4d25e86936822c432c
```

For detailed API Key documentation, see [MCP-API-KEYS-DOCUMENTATION.md](./MCP-API-KEYS-DOCUMENTATION.md).

### Authentication Endpoints

#### POST /api/register
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### POST /api/login
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "last_login": "2024-01-01T00:00:00Z"
}
```

#### POST /api/logout
Terminate user session.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /api/user
Get current authenticated user information.

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "is_active": true,
  "clinics": [
    {
      "id": 1,
      "name": "Medical Center",
      "role": "admin"
    }
  ]
}
```

## Contact Management

### GET /api/contacts
Retrieve all contacts for the authenticated user's clinic.

**Query Parameters:**
- `search` (optional): Search contacts by name, phone, or email
- `status` (optional): Filter by contact status
- `page` (optional): Page number for pagination
- `limit` (optional): Number of results per page

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "name": "Patient Name",
    "phone": "(11) 99999-9999",
    "email": "patient@example.com",
    "age": 35,
    "gender": "male",
    "profession": "Engineer",
    "address": "123 Main St",
    "emergency_contact": "Jane Doe - (11) 88888-8888",
    "medical_history": "No significant medical history",
    "current_medications": ["Medication A", "Medication B"],
    "allergies": ["Peanuts", "Penicillin"],
    "status": "ativo",
    "priority": "normal",
    "source": "whatsapp",
    "first_contact": "2024-01-01T00:00:00Z",
    "last_interaction": "2024-01-05T00:00:00Z"
  }
]
```

### POST /api/contacts
Create a new contact.

**Request Body:**
```json
{
  "name": "Patient Name",
  "phone": "(11) 99999-9999",
  "email": "patient@example.com",
  "age": 35,
  "gender": "male",
  "profession": "Engineer",
  "address": "123 Main St",
  "emergency_contact": "Jane Doe - (11) 88888-8888",
  "medical_history": "No significant medical history",
  "current_medications": ["Medication A"],
  "allergies": ["Peanuts"],
  "status": "novo",
  "priority": "normal",
  "source": "site"
}
```

**Response (201):**
```json
{
  "id": 2,
  "clinic_id": 1,
  "name": "Patient Name",
  // ... other fields
  "created_at": "2024-01-01T00:00:00Z"
}
```

### GET /api/contacts/:id
Retrieve a specific contact by ID.

**Response (200):**
```json
{
  "id": 1,
  "clinic_id": 1,
  "name": "Patient Name",
  // ... all contact fields
}
```

### PUT /api/contacts/:id
Update an existing contact.

**Request Body:** (partial update supported)
```json
{
  "medical_history": "Updated medical history",
  "current_medications": ["New Medication"],
  "status": "em_tratamento"
}
```

**Response (200):**
```json
{
  "id": 1,
  // ... updated contact data
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### GET /api/contacts/:id/appointments
Get all appointments for a specific contact.

**Response (200):**
```json
[
  {
    "id": 1,
    "contact_id": 1,
    "clinic_id": 1,
    "doctor_name": "Dr. Smith",
    "specialty": "Cardiology",
    "appointment_type": "consulta",
    "scheduled_date": "2024-01-10T14:00:00Z",
    "duration_minutes": 60,
    "status": "agendado",
    "payment_status": "pendente",
    "payment_amount": 15000,
    "session_notes": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

## Appointment Management

### GET /api/appointments
Retrieve all appointments for the clinic.

**Query Parameters:**
- `date` (optional): Filter by specific date (YYYY-MM-DD)
- `status` (optional): Filter by appointment status
- `doctor` (optional): Filter by doctor name
- `contact_id` (optional): Filter by contact ID

**Response (200):**
```json
[
  {
    "id": 1,
    "contact_id": 1,
    "clinic_id": 1,
    "doctor_name": "Dr. Smith",
    "specialty": "Cardiology",
    "appointment_type": "primeira_consulta",
    "scheduled_date": "2024-01-10T14:00:00Z",
    "duration_minutes": 60,
    "status": "agendado",
    "cancellation_reason": null,
    "session_notes": null,
    "next_appointment_suggested": null,
    "payment_status": "pendente",
    "payment_amount": 15000,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/appointments
Create a new appointment.

**Request Body:**
```json
{
  "contact_id": 1,
  "doctor_name": "Dr. Smith",
  "specialty": "Cardiology",
  "appointment_type": "consulta",
  "scheduled_date": "2024-01-10T14:00:00Z",
  "duration_minutes": 60,
  "payment_amount": 15000,
  "session_notes": "Initial consultation"
}
```

**Response (201):**
```json
{
  "id": 2,
  "contact_id": 1,
  "clinic_id": 1,
  "status": "agendado",
  "payment_status": "pendente",
  // ... other fields
  "created_at": "2024-01-01T00:00:00Z"
}
```

### PUT /api/appointments/:id
Update an existing appointment.

**Request Body:**
```json
{
  "status": "realizado",
  "session_notes": "Patient responded well to treatment",
  "next_appointment_suggested": "2024-02-10T14:00:00Z",
  "payment_status": "pago"
}
```

## Financial Module

### GET /api/financial/dashboard
Get financial overview and metrics.

**Response (200):**
```json
{
  "totalRevenue": 125000,
  "totalExpenses": 45000,
  "netProfit": 80000,
  "pendingCharges": 25000,
  "overdueCharges": 5000,
  "monthlyRecurringRevenue": 15000,
  "recentTransactions": [
    {
      "id": 1,
      "type": "INCOME",
      "category": "CONSULTATION_FEE",
      "description": "Psychology consultation",
      "amount": 15000,
      "reference_date": "2024-01-01",
      "payment_method": "PIX"
    }
  ],
  "chargesByStatus": [
    {
      "status": "PENDING",
      "count": 5,
      "value": 25000
    },
    {
      "status": "RECEIVED",
      "count": 20,
      "value": 100000
    }
  ]
}
```

### GET /api/financial/customers
Get all billing customers.

**Query Parameters:**
- `search` (optional): Search by name, email, or document

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "contact_id": 1,
    "asaas_customer_id": "cus_000001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "(11) 99999-9999",
    "cpf_cnpj": "123.456.789-00",
    "address": "123 Main St",
    "city": "São Paulo",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/financial/customers
Create a new billing customer.

**Request Body:**
```json
{
  "contact_id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(11) 99999-9999",
  "cpf_cnpj": "123.456.789-00",
  "address": "123 Main St",
  "city": "São Paulo",
  "postal_code": "01234-567"
}
```

### GET /api/financial/charges
Get all payment charges.

**Query Parameters:**
- `customer_id` (optional): Filter by customer
- `status` (optional): Filter by charge status
- `billing_type` (optional): Filter by payment method
- `date_start` (optional): Start date filter
- `date_end` (optional): End date filter

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "customer_id": 1,
    "appointment_id": 1,
    "asaas_charge_id": "pay_123456",
    "billing_type": "PIX",
    "value": 15000,
    "net_value": 14850,
    "description": "Psychology consultation",
    "status": "RECEIVED",
    "due_date": "2024-01-10",
    "payment_date": "2024-01-09T10:30:00Z",
    "invoice_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/financial/charges
Create a new payment charge.

**Request Body:**
```json
{
  "customer_id": 1,
  "appointment_id": 1,
  "billing_type": "PIX",
  "value": 15000,
  "description": "Psychology consultation",
  "due_date": "2024-01-10",
  "external_reference": "APPT-001"
}
```

### GET /api/financial/transactions
Get all financial transactions.

**Query Parameters:**
- `type` (optional): INCOME or EXPENSE
- `category` (optional): Transaction category
- `date_start` (optional): Start date filter
- `date_end` (optional): End date filter

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "type": "INCOME",
    "category": "CONSULTATION_FEE",
    "description": "Psychology consultation payment",
    "amount": 15000,
    "payment_method": "PIX",
    "charge_id": 1,
    "appointment_id": 1,
    "contact_id": 1,
    "reference_date": "2024-01-01",
    "notes": "Payment received via PIX",
    "created_by": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/financial/transactions
Record a new financial transaction.

**Request Body:**
```json
{
  "type": "EXPENSE",
  "category": "OFFICE_SUPPLIES",
  "description": "Medical supplies purchase",
  "amount": 5000,
  "payment_method": "CARD",
  "reference_date": "2024-01-01",
  "notes": "Monthly supplies order"
}
```

## Pipeline/CRM Module

### GET /api/pipeline/stages
Get all pipeline stages.

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "name": "Primeiro Contato",
    "description": "Initial contact with prospect",
    "color": "#3B82F6",
    "order_position": 1,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/pipeline/stages
Create a new pipeline stage.

**Request Body:**
```json
{
  "name": "Consulta Agendada",
  "description": "Appointment scheduled",
  "color": "#10B981",
  "order_position": 2
}
```

### GET /api/pipeline/opportunities
Get all pipeline opportunities.

**Query Parameters:**
- `stage_id` (optional): Filter by pipeline stage
- `status` (optional): Filter by opportunity status
- `assigned_to` (optional): Filter by assigned user

**Response (200):**
```json
[
  {
    "id": 1,
    "clinic_id": 1,
    "stage_id": 1,
    "contact_id": 1,
    "title": "Psychology Treatment - John Doe",
    "description": "Anxiety treatment consultation",
    "value": 150000,
    "probability": 75,
    "expected_close_date": "2024-01-15",
    "status": "open",
    "assigned_to": "Dr. Smith",
    "source": "website",
    "stage_entered_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/pipeline/opportunities
Create a new opportunity.

**Request Body:**
```json
{
  "stage_id": 1,
  "contact_id": 1,
  "title": "Cardiology Consultation - Jane Smith",
  "description": "Heart check-up consultation",
  "value": 200000,
  "probability": 80,
  "expected_close_date": "2024-01-20",
  "assigned_to": "Dr. Johnson",
  "source": "referral"
}
```

### PUT /api/pipeline/opportunities/:id/stage
Move opportunity to different stage.

**Request Body:**
```json
{
  "stage_id": 2,
  "notes": "Appointment successfully scheduled"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied to this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- General endpoints: 100 requests per minute per IP
- Authentication endpoints: 10 requests per minute per IP
- File upload endpoints: 20 requests per minute per user

## Pagination

Endpoints that return lists support pagination:

**Request:**
```
GET /api/contacts?page=1&limit=20
```

**Response Headers:**
```
X-Total-Count: 150
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 8
```

## Webhooks (Asaas Integration)

### Payment Status Updates

The system receives webhooks from Asaas for payment status changes:

**Webhook URL:** `POST /api/webhooks/asaas`

**Payload Example:**
```json
{
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_123456",
    "status": "RECEIVED",
    "value": 150.00,
    "netValue": 148.50,
    "paymentDate": "2024-01-01T10:30:00.000Z"
  }
}
```

The webhook automatically updates the corresponding charge and creates a financial transaction record.