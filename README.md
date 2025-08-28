Dhiraagu OTT Subscription Service
This Node.js application provides a backend service for managing contacts and subscriptions in a CRM system, specifically tailored for the "Dhiraagu OTT" service. It exposes two main API endpoints: one to retrieve contact details based on a phone number and another to handle the subscription process for new or existing contacts. The service integrates with a CRM API to perform operations such as creating contacts, registering tags, devices, accounts, journal entries, and subscriptions.
Features

Contact Lookup: Retrieves contact details by phone number, checking for the presence of the "Dhiraagu OTT" tag and active subscriptions.
Subscription Management: Handles the end-to-end subscription process, including contact creation, tag registration, device registration, account creation, journal entry creation, and subscription activation.
Error Handling: Robust error handling with appropriate HTTP status codes and messages for various failure scenarios.
Timeout Management: Implements timeouts for API calls to prevent hanging requests.
Input Validation: Validates request payloads to ensure required fields are present.

Endpoints
GET /contacts/:phone_number

Description: Retrieves contact details for a given phone number, including whether the contact has the "Dhiraagu OTT" tag and an active subscription.
Response:
200: Success with contact details.
404: Contact or "Dhiraagu OTT" tag not found.
500: Internal server error.



POST /subscribe

Description: Handles the subscription process for a contact. Checks if the contact exists and has the "Dhiraagu OTT" tag. If not, it creates a new contact, registers a tag, device, account, journal entry, and subscription.
Request Body:{
  "person_name": {
    "first_name": "string",
    "last_name": "string"
  },
  "phone": {
    "number": "string"
  }
}


Response:
200: Success with subscription details (for existing contacts with tag).
201: Success with subscription details (for new subscriptions).
400: Invalid payload or failed operation.
409: Contact exists but lacks "Dhiraagu OTT" tag.
500: Internal server error.



Key Components
Configuration

Environment Variables: The service relies on environment variables (loaded into CONFIG) for CRM API endpoints, API keys, and other settings (e.g., CRM_BASE_URL, CRM_API_KEY, DEFAULT_TAG_ID).
Headers: Uses a consistent crmHeaders object with Accept, Content-Type, and api_key for all CRM API requests.

Core Functions

fetchContactTags: Retrieves tags associated with a contact.
fetchContactSubscriptions: Fetches subscription details for a contact, including billing and future information.
checkExistingContact: Checks if a contact exists with the "Dhiraagu OTT" tag and returns subscription details if applicable.
getContactDetails: Handles the GET endpoint to retrieve contact details.
handleSubscribe: Manages the POST endpoint for the subscription process.
Utility Functions:
handleResponse: Processes HTTP responses and handles errors.
withTimeout: Adds timeout functionality to API calls.
validatePayload: Validates the request payload for required fields.


Service Functions:
createContact: Creates a new contact in the CRM.
registerContactTag: Assigns the "Dhiraagu OTT" tag to a contact.
registerDevice: Registers a device for a contact.
createAccount: Creates an account for a contact.
createJournalEntry: Adds a journal entry (e.g., initial credit) for an account.
createSubscription: Creates a subscription with fallback logic for price terms.
getCustomFields, postAssignDevices, getAssignDevices, postAddSubscriptionDevice, getAllowedDevices: Manage device assignments and custom fields for subscriptions.
getSubscriptionDetails: Retrieves detailed subscription information, including device IDs and custom fields.



Dependencies

uuid: Generates unique identifiers for contacts, devices, and other entities.
Node.js Fetch API: Used for making HTTP requests to the CRM API.
Environment Variables: Must be configured for CRM API access (e.g., CRM_API_KEY, CRM_BASE_URL).

Setup

Install Dependencies:
npm install uuid


Configure Environment Variables:Create a .env file with the following variables:
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


Run the Application:Ensure the Node.js server is running (e.g., using Express) and the CRM API is accessible.


Usage
Contact Lookup
curl -X GET http://localhost:3000/contacts/+1234567890

Subscribe
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

Error Handling

The service uses HTTP status codes to indicate success or failure:
200: Successful operation (existing contact with tag).
201: Successful subscription creation.
400: Invalid input or failed operation.
404: Contact or tag not found.
409: Contact exists but lacks the required tag.
500: Server or CRM API errors.


All API calls are wrapped with timeouts to prevent hanging requests.
Detailed logging is implemented for debugging purposes.

Notes

The service assumes the CRM API supports the specified endpoints and payloads.
The "Dhiraagu OTT" tag is used to identify eligible contacts for the subscription service.
Fallback logic is implemented for subscription creation if the primary PRICE_TERMS_ID fails.
Device assignment supports single-device scenarios, with warnings for multiple device IDs.

License
This project is licensed under the MIT License.
