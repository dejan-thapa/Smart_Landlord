-- Create Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    room_no TEXT NOT NULL UNIQUE,
    base_rent NUMERIC NOT NULL,
    email TEXT,
    phone_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Utility Master Bills Table
CREATE TABLE utility_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_month TEXT NOT NULL, -- Format: YYYY-MM
    total_water NUMERIC NOT NULL,
    total_wifi NUMERIC NOT NULL,
    total_garbage NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Meter Readings Table (Linked to room_no per user request)
CREATE TABLE meter_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_no TEXT NOT NULL REFERENCES tenants(room_no) ON DELETE CASCADE,
    billing_month TEXT NOT NULL, -- Format: YYYY-MM
    previous_reading NUMERIC NOT NULL,
    current_reading NUMERIC NOT NULL,
    rate_per_unit NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_no, billing_month)
);

-- Create Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    billing_month TEXT NOT NULL, -- Format: YYYY-MM
    rent_amount NUMERIC NOT NULL,
    water_share NUMERIC NOT NULL,
    wifi_share NUMERIC NOT NULL,
    garbage_share NUMERIC NOT NULL,
    electricity_cost NUMERIC NOT NULL,
    total_due NUMERIC NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, billing_month)
);
