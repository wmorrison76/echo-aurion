# Production Integration Setup Guide

This guide provides step-by-step instructions for connecting all real services required for production go-live.

## Table of Contents

1. [Email & Notifications (SendGrid)](#email--notifications-sendgrid)
2. [Accounting Systems (NetSuite)](#accounting-systems-netsuite)
3. [Food Service Suppliers](#food-service-suppliers)
   - [GFS (Gordon Food Service)](#gfs-gordon-food-service)
   - [Restaurant Depot](#restaurant-depot)
   - [Shamrock Foods (EDI)](#shamrock-foods-edi)
   - [Reinhart Foods (EDI)](#reinhart-foods-edi)

---

## Email & Notifications (SendGrid)

SendGrid provides reliable transactional email delivery for order confirmations, approval requests, and system notifications.

### Setup Instructions

1. **Create SendGrid Account**
   - Visit [SendGrid Sign Up](https://signup.sendgrid.com/)
   - Create a free or paid account based on your volume needs
   - Verify your sender identity (domain or email address)

2. **Generate API Key**
   - Log in to SendGrid dashboard: https://app.sendgrid.com
   - Navigate to **Settings** → **API Keys**
   - Click **Create API Key**
   - Select **Full Access** or customize permissions
   - Copy the API key (starts with `SG.`)

3. **Configure From Email**
   - Go to **Settings** → **Sender Verification**
   - Add your company domain or email address
   - Verify it via DNS records or email confirmation

4. **Set Environment Variables**
   ```bash
   SENDGRID_API_KEY=SG.your-api-key-here
   SENDGRID_FROM_EMAIL=noreply@yourcompany.com
   ```

5. **Test Integration**
   - Use the test endpoint to verify connectivity:
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "personalizations": [{
         "to": [{"email": "test@example.com"}],
         "subject": "Test Email"
       }],
       "from": {"email": "noreply@yourcompany.com"},
       "content": [{
         "type": "text/plain",
         "value": "Test email from Echo Ops"
       }]
     }'
   ```

### Features Enabled After Setup
- Invoice notification emails
- Approval request notifications
- Order confirmation emails
- System alerts and warnings
- User account notifications

---

## Accounting Systems (NetSuite)

NetSuite integration enables automated bill export, multi-subsidiary support, and GL account mapping.

### Prerequisites
- NetSuite account with developer access
- Administrator credentials
- GL account mapping setup

### Setup Instructions

1. **Enable OAuth2 in NetSuite**
   - Log in to NetSuite: https://system.netsuite.com
   - Navigate to **Setup** → **Integration** → **OAuth 2.0 Applications**
   - Click **New**
   - Fill in application details:
     - **Name**: Echo Ops Integration
     - **Redirect URI**: `http://your-domain.com/api/accounting/netsuite-callback`
     - **Scopes**: Select `rest_webservices`

2. **Copy OAuth Credentials**
   - Save the application
   - Copy the **Client ID** and **Client Secret**
   - Get your **Account ID** (Realm ID) from Setup → Company → Company Information

3. **Set Environment Variables**
   ```bash
   NETSUITE_CLIENT_ID=your-client-id
   NETSUITE_CLIENT_SECRET=your-client-secret
   NETSUITE_REALM_ID=your-account-id
   NETSUITE_REDIRECT_URI=http://your-domain.com/api/accounting/netsuite-callback
   
   # For production:
   NETSUITE_API_URL=https://api.netsuite.com
   # For sandbox:
   NETSUITE_API_URL=https://api.sandbox.netsuite.com
   ```

4. **Configure GL Account Mapping**
   - In Echo Ops, go to **Settings** → **GL Accounts**
   - Map your GL accounts to NetSuite account numbers:
     - Example: Accounts Payable (1000) → NetSuite AP Account (2000)
     - Example: Vendor Expense (5100) → NetSuite Expense Account (5000)
   - Save mappings to database via API

5. **Test OAuth Flow**
   - Go to **Accounting** → **Integrations** → **NetSuite**
   - Click "Connect to NetSuite"
   - You'll be redirected to NetSuite login
   - Authorize the application
   - System will store OAuth token securely

6. **Test Bill Export**
   - Create a test invoice in Echo Ops
   - Click "Export to NetSuite"
   - Verify it appears in NetSuite as a Vendor Bill

### Features Enabled After Setup
- Automated bill export to NetSuite
- Multi-subsidiary support
- GL account mapping validation
- Invoice tracking with NetSuite transaction IDs
- Intercompany allocation support

---

## Food Service Suppliers

### GFS (Gordon Food Service)

GFS provides food service catalog access and API-based ordering.

#### Setup Instructions

1. **Request API Access**
   - Contact your GFS Account Manager
   - Request API credentials and sandbox access
   - Provide callback/webhook URL: `http://your-domain.com/api/suppliers/gfs/webhook`

2. **Receive GFS Credentials**
   - GFS will provide:
     - API Key / Authorization Token
     - API Base URL (sandbox vs. production)
     - Customer Account Number

3. **Set Environment Variables**
   ```bash
   GFS_API_KEY=your-gfs-api-key
   GFS_BASE_URL=https://api.sandbox.gfsdeliver.com/v1
   # For production: https://api.gfsdeliver.com/v1
   ```

4. **Test Catalog Sync**
   - Go to **Purchasing** → **Supplier Catalogs**
   - Click "Sync GFS Catalog"
   - Products should appear within 30 seconds

5. **Test Order Submission**
   - Create a test order with GFS items
   - Click "Submit Order"
   - Verify order appears in GFS account

#### Features Enabled
- Product catalog sync
- Real-time inventory availability
- API-based order submission
- Order tracking and status updates
- Pricing synchronization

---

### Restaurant Depot

Restaurant Depot integration enables catalog access and order management.

#### Setup Instructions

1. **Request API Access**
   - Contact Restaurant Depot Procurement Services
   - Request API credentials
   - Provide application details and use case

2. **Receive Credentials**
   - Restaurant Depot will provide:
     - API Key
     - API Base URL
     - Account ID

3. **Set Environment Variables**
   ```bash
   RESTAURANT_DEPOT_API_KEY=your-rd-api-key
   RESTAURANT_DEPOT_BASE_URL=https://api.restaurantdepot.com/v1
   ```

4. **Test Catalog Sync**
   - Go to **Purchasing** → **Supplier Catalogs**
   - Click "Sync Restaurant Depot"
   - Products should appear within 30 seconds

5. **Test Order Submission**
   - Create a test order with Restaurant Depot items
   - Click "Submit Order"
   - Verify in Restaurant Depot account

#### Features Enabled
- Product catalog management
- Order submission and tracking
- Inventory availability
- Pricing synchronization

---

### Shamrock Foods (EDI)

Shamrock integration uses EDI (Electronic Data Interchange) for order transmission and invoice reception.

#### Prerequisites
- EDI transmission provider account (ConnectEDI, SPS Commerce, or similar)
- Shamrock Foods EDI enrollment
- SAN/VAN ID from Shamrock

#### Setup Instructions

1. **Register with Shamrock EDI Program**
   - Contact Shamrock Foods EDI Support
   - Provide company information and trading partner requirements
   - Receive SAN/VAN ID and connection instructions

2. **Choose EDI Provider**
   - **ConnectEDI**: https://www.connectedi.com
   - **SPS Commerce**: https://www.spscommerce.com
   - **TrustTrade**: https://www.trusttrade.com
   
   Request an account and API credentials from your chosen provider

3. **Configure EDI Connection**
   - In your EDI provider's dashboard:
     - Add Shamrock as a trading partner
     - Configure 850 (Purchase Order) and 810/856 (Invoice/Ship Notice) message types
     - Set inbound/outbound mailbox URLs

4. **Set Environment Variables**
   ```bash
   # Shamrock Foods
   SHAMROCK_EDI_SENDER_ID=your-sender-id
   SHAMROCK_EDI_RECEIVER_ID=shamrock-receiver-id
   SHAMROCK_EDI_PROVIDER=connectedi
   SHAMROCK_EDI_API_KEY=your-edi-provider-api-key
   SHAMROCK_EDI_BASE_URL=https://api.connectedi.com/v1
   ```

5. **Test EDI Transmission**
   - Create test order in Echo Ops with Shamrock items
   - Click "Submit EDI Order"
   - Check EDI provider dashboard for successful transmission
   - Verify acknowledgment (997) receipt

#### Features Enabled
- EDI 850 Purchase Order transmission
- EDI 810 Invoice reception and processing
- EDI 856 Ship Notice processing
- EDI 997 Functional Acknowledgment
- Full order lifecycle tracking

#### EDI Message Types
- **850**: Purchase Order (outbound)
- **810**: Invoice (inbound)
- **856**: Ship Notice/Manifest (inbound)
- **997**: Functional Acknowledgment (both directions)

---

### Reinhart Foods (EDI)

Reinhart integration mirrors Shamrock with EDI-based order and invoice exchange.

#### Prerequisites
- EDI transmission provider account
- Reinhart Foods EDI enrollment
- SAN/VAN ID from Reinhart

#### Setup Instructions

1. **Register with Reinhart EDI Program**
   - Contact Reinhart Foods Purchasing
   - Provide company trading partner information
   - Receive SAN/VAN ID and EDI specifications

2. **Choose EDI Provider**
   - Same providers as Shamrock:
     - ConnectEDI, SPS Commerce, TrustTrade
   - Request API credentials

3. **Configure EDI Connection**
   - Add Reinhart as trading partner in EDI provider
   - Configure 850, 810, 856 message types
   - Set mailbox URLs for EDI transmission

4. **Set Environment Variables**
   ```bash
   # Reinhart Foods
   REINHART_EDI_SENDER_ID=your-sender-id
   REINHART_EDI_RECEIVER_ID=reinhart-receiver-id
   REINHART_EDI_PROVIDER=connectedi
   REINHART_EDI_API_KEY=your-edi-provider-api-key
   REINHART_EDI_BASE_URL=https://api.connectedi.com/v1
   ```

5. **Test EDI Transmission**
   - Create test order in Echo Ops with Reinhart items
   - Click "Submit EDI Order"
   - Verify EDI transmission in provider dashboard
   - Check for acknowledgment receipt

#### Features Enabled
- EDI 850 Purchase Order transmission
- EDI 810 Invoice reception
- EDI 856 Ship Notice processing
- EDI 997 Acknowledgments
- Complete order tracking

---

## Testing Checklist

### Pre-Production Testing

- [ ] SendGrid test email received
- [ ] NetSuite OAuth flow completes successfully
- [ ] NetSuite test bill exports correctly
- [ ] GFS catalog syncs and displays products
- [ ] GFS test order submits successfully
- [ ] Restaurant Depot catalog loads
- [ ] Restaurant Depot test order submits
- [ ] Shamrock EDI 850 transmits successfully
- [ ] Shamrock EDI 997 acknowledgment received
- [ ] Reinhart EDI 850 transmits successfully
- [ ] Reinhart EDI 997 acknowledgment received

### Load Testing

- [ ] Handle concurrent email sends (1000+ emails)
- [ ] Batch order submissions to multiple suppliers
- [ ] EDI message processing under load
- [ ] API response times < 2 seconds

### Security Testing

- [ ] API keys properly encrypted in database
- [ ] OAuth tokens refresh automatically
- [ ] No credentials logged in application logs
- [ ] Rate limiting prevents abuse
- [ ] Webhook signatures verified

---

## Troubleshooting

### SendGrid Issues

**Problem**: "Invalid API key"
- Verify API key copied correctly (no spaces)
- Check key hasn't expired in SendGrid dashboard
- Ensure API key has "Mail Send" permission

**Problem**: "From address not verified"
- Go to Settings → Sender Verification in SendGrid
- Verify domain via DNS or confirm verification email

### NetSuite Issues

**Problem**: "Invalid client credentials"
- Verify Client ID and Client Secret match
- Check realm ID is correct (not account number)
- Ensure app is enabled in NetSuite

**Problem**: "OAuth token expired"
- System automatically refreshes tokens
- Check NETSUITE_API_URL is correct for environment

### EDI Issues

**Problem**: "EDI transmission failed"
- Verify EDI provider API key and URL
- Check Sender ID and Receiver ID match Shamrock/Reinhart records
- Ensure EDI message format is valid X12

**Problem**: "997 Acknowledgment not received"
- Check EDI provider mailbox settings
- Verify message routing configuration
- Contact supplier's EDI support

---

## Environment Variables Reference

### Email
```bash
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@company.com
```

### NetSuite
```bash
NETSUITE_CLIENT_ID=xxxxx
NETSUITE_CLIENT_SECRET=xxxxx
NETSUITE_REALM_ID=xxxxx
NETSUITE_REDIRECT_URI=http://localhost:3000/callback
NETSUITE_API_URL=https://api.sandbox.netsuite.com
```

### GFS
```bash
GFS_API_KEY=xxxxx
GFS_BASE_URL=https://api.sandbox.gfsdeliver.com/v1
```

### Restaurant Depot
```bash
RESTAURANT_DEPOT_API_KEY=xxxxx
RESTAURANT_DEPOT_BASE_URL=https://api.restaurantdepot.com/v1
```

### Shamrock EDI
```bash
SHAMROCK_EDI_SENDER_ID=xxxxx
SHAMROCK_EDI_RECEIVER_ID=xxxxx
SHAMROCK_EDI_API_KEY=xxxxx
SHAMROCK_EDI_PROVIDER=connectedi
SHAMROCK_EDI_BASE_URL=https://api.connectedi.com/v1
```

### Reinhart EDI
```bash
REINHART_EDI_SENDER_ID=xxxxx
REINHART_EDI_RECEIVER_ID=xxxxx
REINHART_EDI_API_KEY=xxxxx
REINHART_EDI_PROVIDER=connectedi
REINHART_EDI_BASE_URL=https://api.connectedi.com/v1
```

---

## Support & Contact Information

### SendGrid Support
- Website: https://sendgrid.com/support
- Docs: https://docs.sendgrid.com

### NetSuite Support
- Website: https://www.netsuite.com
- Support Portal: https://system.netsuite.com > Help Center

### GFS Support
- Contact your Account Manager
- GFS EDI Support: https://www.gfsdeliver.com

### Restaurant Depot Support
- Procurement Services
- API Documentation: https://api.restaurantdepot.com/docs

### EDI Provider Support
- **ConnectEDI**: https://www.connectedi.com/support
- **SPS Commerce**: https://www.spscommerce.com/support
- **TrustTrade**: https://www.trusttrade.com/support

### Echo Ops Support
- Technical Support: support@echo-ops.example.com
- Documentation: https://docs.echo-ops.example.com
