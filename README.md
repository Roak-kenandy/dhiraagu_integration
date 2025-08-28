# Dhiraagu OTT Subscription Service

A Node.js backend service for managing contacts and subscriptions in a CRM system, specifically tailored for the "Dhiraagu OTT" service. This application provides comprehensive contact lookup and subscription management capabilities with robust error handling and timeout management.

## 🚀 Features

- **Contact Lookup**: Retrieve contact details by phone number with "Dhiraagu OTT" tag verification
- **Subscription Management**: End-to-end subscription process handling
- **Error Handling**: Robust error handling with appropriate HTTP status codes
- **Timeout Management**: Prevents hanging requests with configurable timeouts
- **Input Validation**: Ensures required fields are present in requests
- **Device Management**: Handles device registration and assignment
- **Account Creation**: Automated account setup with journal entries

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Error Handling](#error-handling)
- [Development](#development)
- [License](#license)

## 🛠 Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to CRM API

### Install Dependencies

```bash
npm install uuid
```

### Environment Setup

Create a `.env` file in the root directory:

```env
CRM_API_KEY=your_api_key
CRM_BASE_URL=https://your-crm-api-base-url
DEFAULT_TAG_ID=dhiraagu_ott_tag_id
DEVICE_PRODUCT_ID=device_product_id
CLASSIFICATION_ID=classification_id
CURRENCY_CODE=MVR
PAYMENT_TERMS_ID=payment_terms_id
SERVICE_PRODUCT_ID=service_product_id
PRICE_TERMS_ID=price_terms_id
PRICE_TERMS_ID_SECOND=fallback_price_terms_id
```

## ⚙️ Configuration

The service uses environment variables for configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| `CRM_API_KEY` | API key for CRM access | ✅ |
| `CRM_BASE_URL` | Base URL for CRM API | ✅ |
| `DEFAULT_TAG_ID` | Dhiraagu OTT tag identifier | ✅ |
| `DEVICE_PRODUCT_ID` | Product ID for devices | ✅ |
| `CLASSIFICATION_ID` | Classification identifier | ✅ |
| `CURRENCY_CODE` | Currency code (default: MVR) | ✅ |
| `PAYMENT_TERMS_ID` | Payment terms identifier | ✅ |
| `SERVICE_PRODUCT_ID` | Service product identifier | ✅ |
| `PRICE_TERMS_ID` | Primary price terms ID | ✅ |
| `PRICE_TERMS_ID_SECOND` | Fallback price terms ID | ✅ |

## 🔌 API Endpoints

### Get Contact Details

**GET** `/contacts/:phone_number`

Retrieves contact details for a given phone number, including "Dhiraagu OTT" tag status and active subscriptions.

#### Response Codes
- `200` - Success with contact details
- `404` - Contact or "Dhiraagu OTT" tag not found
- `500` - Internal server error

### Subscribe Contact

**POST** `/subscribe`

Handles the subscription process for a contact. Creates new contact if needed, assigns tags, registers devices, and activates subscription.

#### Request Body
```json
{
  "person_name": {
    "first_name": "string",
    "last_name": "string"
  },
  "phone": {
    "number": "string"
  }
}
```

#### Response Codes
- `200` - Success for existing contacts with tag
- `201` - Success for new subscriptions
- `400` - Invalid payload or failed operation
- `409` - Contact exists but lacks "Dhiraagu OTT" tag
- `500` - Internal server error

## 📚 Usage Examples

### Contact Lookup

```bash
curl -X GET http://localhost:3000/contacts/+1234567890
```

### Subscribe New Contact

```bash
curl -X POST http://localhost:3000/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "person_name": {
      "first_name": "John",
      "last_name": "Doe"
    },
    "phone": {
      "number": "+1234567890"
    }
  }'
```

### Example Response (Success)

```json
{
  "status": "success",
  "message": "Subscription created successfully",
  "data": {
    "contact_id": "uuid-string",
    "subscription_id": "uuid-string",
    "device_id": "uuid-string",
    "account_id": "uuid-string"
  }
}
```

## 🏗 Architecture

### Core Functions

#### Contact Management
- `fetchContactTags` - Retrieves tags associated with a contact
- `fetchContactSubscriptions` - Fetches subscription details for a contact
- `checkExistingContact` - Checks contact existence with "Dhiraagu OTT" tag
- `getContactDetails` - Handles GET endpoint for contact retrieval

#### Subscription Management
- `handleSubscribe` - Manages POST endpoint for subscription process
- `createContact` - Creates new contact in CRM
- `registerContactTag` - Assigns "Dhiraagu OTT" tag to contact
- `registerDevice` - Registers device for contact
- `createAccount` - Creates account for contact
- `createJournalEntry` - Adds journal entry for account
- `createSubscription` - Creates subscription with fallback logic

#### Utility Functions
- `handleResponse` - Processes HTTP responses and handles errors
- `withTimeout` - Adds timeout functionality to API calls
- `validatePayload` - Validates request payload for required fields

### Service Flow

1. **Contact Lookup**: Check if contact exists with phone number
2. **Tag Verification**: Verify "Dhiraagu OTT" tag presence
3. **Contact Creation**: Create contact if not exists
4. **Tag Assignment**: Assign required tags
5. **Device Registration**: Register device for contact
6. **Account Setup**: Create account and journal entries
7. **Subscription Activation**: Create and activate subscription

## 🚨 Error Handling

The service implements comprehensive error handling:

### HTTP Status Codes
- `200` - Successful operation (existing contact)
- `201` - Successful subscription creation
- `400` - Invalid input or failed operation
- `404` - Contact or tag not found
- `409` - Contact exists but lacks required tag
- `500` - Server or CRM API errors

### Timeout Protection
- All API calls include timeout protection
- Prevents hanging requests
- Configurable timeout values

### Validation
- Request payload validation
- Required field verification
- Phone number format validation

## 🧪 Development

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Debugging

The service includes detailed logging for debugging purposes:

```javascript
// Enable debug logging
DEBUG=dhiraagu:* npm start
```

## 🔧 Key Features

### Device Management
- Single-device scenario support
- Device ID assignment
- Custom field management
- Device allocation warnings

### Subscription Features
- Fallback logic for price terms
- Billing information management
- Future subscription handling
- Custom field support

### CRM Integration
- Consistent header management
- API key authentication
- Base URL configuration
- Response handling

## 📝 Notes

- Service assumes CRM API supports specified endpoints and payloads
- "Dhiraagu OTT" tag identifies eligible contacts for subscription service
- Fallback logic implemented for subscription creation if primary `PRICE_TERMS_ID` fails
- Device assignment supports single-device scenarios with warnings for multiple device IDs
- All timestamps and IDs use UUID format for consistency

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
