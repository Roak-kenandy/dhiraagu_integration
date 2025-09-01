const { v4: uuidv4 } = require('uuid');
const API_KEY = process.env.CRM_API_KEY;

const crmHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'api_key': API_KEY,
}

// Configuration constants (loaded from environment variables)
const CONFIG = {
  CRM_BASE_URL: process.env.CRM_BASE_URL,
  DEFAULT_TAG_ID: process.env.DEFAULT_TAG_ID,
  DEVICE_PRODUCT_ID: process.env.DEVICE_PRODUCT_ID,
  CLASSIFICATION_ID: process.env.CLASSIFICATION_ID,
  CURRENCY_CODE: process.env.CURRENCY_CODE,
  PAYMENT_TERMS_ID: process.env.PAYMENT_TERMS_ID,
  SERVICE_PRODUCT_ID: process.env.SERVICE_PRODUCT_ID,
  PRICE_TERMS_ID: process.env.PRICE_TERMS_ID,
  PRICE_TERMS_ID_SECOND: process.env.PRICE_TERMS_ID_SECOND,
  CRM_API_KEY: process.env.CRM_API_KEY,
};

// Fetch contact tags
const fetchContactTags = async (contactId) => {
    const response = await fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/tags`, {
        method: 'GET',
        headers: crmHeaders
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.status}`);
    }
    return response.json();
};

// Fetch contact subscriptions
const fetchContactSubscriptions = async (contactId) => {
    const response = await fetch(
        `${CONFIG.CRM_BASE_URL}/contacts/${contactId}/subscriptions?size=100&page=1&include_terms=true&include_billing_info=true&include_future_info=true`,
        {
            method: 'GET',
            headers: crmHeaders
        }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
    }
    return response.json();
};

// Check if contact exists with Dhiraagu OTT tag
const checkExistingContact = async (phoneNumber, reqBody) => {
  const response = await fetch(
    `${CONFIG.CRM_BASE_URL}/contacts?${new URLSearchParams({ phone_number: phoneNumber }).toString()}`,
    {
      method: 'GET',
      headers: crmHeaders
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.status}`);
  }

  const contactsData = await response.json();
  if (!contactsData.content || contactsData.content.length === 0) {
    return {
      status: '404',
      message: 'Contact not found',
      data: null,
    };
  }

  const contact = contactsData.content[0];
  const contactId = contact.id;

  const tagsData = await fetchContactTags(contactId);
  const hasOTTTag = tagsData.content?.some(tag => tag.name === 'Dhiraagu OTT');

  if (!hasOTTTag) {
    return {
      status: '409',
      message: 'Dhiraagu OTT tag not found for contact',
      data: { contactId },
    };
  }

  // Fetch subscription details if tag exists
  const subscriptionDetails = await getSubscriptionDetails(contactId, reqBody);

  return {
    status: '200',
    message: 'success',
    data: {
      id: contactId,
      firstname: subscriptionDetails.firstname,
      lastname: subscriptionDetails.lastname,
      tag: 'Dhiraagu OTT',
      number: subscriptionDetails.number,
      subscribed: subscriptionDetails.state === 'ACTIVE',
    },
  };
};


const getContactDetails = async (req, res) => {
    const { phone_number } = req.body;

    try {
        // Fetch contacts
        const contactsResponse = await fetch(
            `${CONFIG.CRM_BASE_URL}/contacts?${new URLSearchParams({ phone_number }).toString()}`,
            {
                method: 'GET',
                headers: crmHeaders
            }
        );

        const contactsData = await contactsResponse.json();
        

        if (!contactsResponse.ok) {
            return res.status(contactsResponse.status).json({
                status: contactsResponse.status.toString(),
                message: 'Failed to fetch contacts',
                data: null
            });
        }

        if (!contactsData.content || contactsData.content.length === 0) {
            return res.status(404).json({
                status: '404',
                message: 'No contacts found for the given phone number',
                data: null
            });
        }

        // Process first contact only
        const contact = contactsData.content[0];
        const contactId = contact.id;

        // Fetch tags
        let hasOTTTag = false;
        try {
            const tagsData = await fetchContactTags(contactId);
            hasOTTTag = tagsData.content?.some(tag => tag.name === 'Dhiraagu OTT');
        } catch (error) {
            console.error(`Error fetching tags for contact ${contactId}:`, error);
            return res.status(500).json({
                status: '500',
                message: 'Failed to fetch contact tags',
                data: null
            });
        }

        // Return 404 if no OTT tag
        if (!hasOTTTag) {
            return res.status(404).json({
                status: '404',
                message: 'Customer not found',
                data: null
            });
        }

        // Initialize response data
        const responseData = {
            id: uuidv4(),
            name: contact.name,
            tag: 'Dhiraagu OTT',
            number: phone_number,
            subscribed: false
        };

        // Fetch subscriptions since OTT tag exists
        try {
            const subscriptionsData = await fetchContactSubscriptions(contactId);
            
            if (subscriptionsData.content?.length > 0) {
                const subscription = subscriptionsData.content[0];
                // Set subscribed to true only if state is ACTIVE
                responseData.subscribed = subscription.state === 'ACTIVE';
            }
        } catch (error) {
            console.error(`Error fetching subscriptions:`, error);
        }

        return res.status(200).json({
            status: '200',
            message: 'success',
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching data from CRM:', error);
        return res.status(500).json({
            status: '500',
            message: 'Internal server error',
            data: null
        });
    }
};

// Utility function to handle HTTP responses
const handleResponse = async (response, operation) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${operation} failed: ${data.message || 'Unknown error'} (Status: ${response.status})`);
  }
  return data;
};

// Utility function to add timeout to promises
const withTimeout = async (fn, ms, operation) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([Promise.resolve(fn()), timeout]);
    return result;
  } catch (error) {
    console.error(`withTimeout error for ${operation}:`, error);
    throw error;
  }
};

// Input validation for the request payload
const validatePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload: Request body is required');
  }
  if (!payload.first_name || !payload.last_name || !payload.number) {
    throw new Error('Invalid payload: First name and phone number are required');
  }
};

// Service functions for each operation
// Service function to create contact
const createContact = async (body) => {
  try {
    // Build CRM payload
    const payload = {
      type: "PERSON",
      person_name: {
        first_name: body.first_name,
        last_name: body.last_name,
      },
      phone: {
        country_code: "MDV",
        number: body.number,
        type: "MOBILE",
      },
    };

    // Send to CRM API
    const response = await withTimeout(
      async () =>
        fetch(`${CONFIG.CRM_BASE_URL}/contacts`, {
          method: "POST",
          headers: crmHeaders,
          body: JSON.stringify(payload),
        }),
      5000,
      "Contact creation"
    );

    const data = await handleResponse(response, "Contact creation");
    return data;
  } catch (error) {
    console.error("Contact creation error:", error);
    throw error;
  }
};


const registerContactTag = async (contactId, tags = [CONFIG.DEFAULT_TAG_ID]) => {
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/tags`, {
      method: 'PUT',
      headers: crmHeaders,
      body: JSON.stringify({ tags }),
    }),
    2000,
    'Tag registration'
  );
  return handleResponse(response, 'Tag registration');
};

const registerDevice = async (contactId) => {
  const payload = {
    serial_number: uuidv4(),
    electronic_id: null,
    contact_id: contactId,
    product_id: CONFIG.DEVICE_PRODUCT_ID,
  };
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/devices`, {
      method: 'POST',
      headers: crmHeaders,
      body: JSON.stringify(payload),
    }),
    2000,
    'Device registration'
  );
  return handleResponse(response, 'Device registration');
};

const createAccount = async (contactId) => {
  const payload = {
    classification_id: CONFIG.CLASSIFICATION_ID,
    credit_limit: '',
    currency_code: CONFIG.CURRENCY_CODE,
    is_primary: false,
    payment_terms_id: CONFIG.PAYMENT_TERMS_ID,
  };
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/accounts`, {
      method: 'POST',
      headers: crmHeaders,
      body: JSON.stringify(payload),
    }),
    2000,
    'Account creation'
  );
  return handleResponse(response, 'Account creation');
};

const fetchAccounts = async (contactId) => {
  const response = await fetch(
    `${CONFIG.CRM_BASE_URL}/contacts/${contactId}/accounts`,
    { headers: crmHeaders }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.status}`);
  }

  const accountsData = await response.json();
  if (!accountsData.content || accountsData.content.length === 0) {
    throw new Error('No accounts found for this contact');
  }

  // Assuming we take the first account if multiple exist
  return accountsData.content[0];
};


const createPayment = async (contactId, payment_ref, accountId) => {
  const payload = {
    contact_id: contactId,
    account_id: accountId,
    amount: 35,
    currency_code: 'MVR',
    notes: 'Dhiraagu Payment',
    payment_method: {
      type: 'ELECTRONIC_TRANSFER'
    },
    state: 'POSTED',
    backoffice_code: payment_ref,
    type_id: 'a3afdee8-3596-4e3a-8df4-1ddc99f86107',
    external_payable: ['Dhiraagu Payment']
  };

  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/payments`, {
      method: 'POST',
      headers: crmHeaders,
      body: JSON.stringify(payload),
    }),
    2000,
    'Payment creation'
  );

  return handleResponse(response, 'Payment creation');
};


const createSubscription = async (contactId, accountId) => {
  const tryPostSubscription = async (priceTermsId) => {
    const payload = {
      account_id: accountId,
      scheduled_date: null,
      services: [{
        price_terms_id: priceTermsId,
        product_id: CONFIG.SERVICE_PRODUCT_ID,
        quantity: 1,
      }],
    };
    const response = await withTimeout(
      async () => fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/services`, {
        method: 'POST',
        headers: crmHeaders,
        body: JSON.stringify(payload),
      }),
      2000,
      'Subscription creation'
    );
    return handleResponse(response, 'Subscription creation');
  };

  try {
    return await tryPostSubscription(CONFIG.PRICE_TERMS_ID);
  } catch (error) {
    if (error.message.includes('Invalid value')) {
      console.warn('First price_terms_id failed, retrying with fallback ID...');
      return await tryPostSubscription(CONFIG.PRICE_TERMS_ID_SECOND);
    }
    throw error;
  }
};

const getCustomFields = async (subscriptionId) => {
  const response = await withTimeout(
    async () => fetch(
      `${CONFIG.CRM_BASE_URL}/subscriptions/${subscriptionId}/devices?include_total=true&include_custom_fields=true&size=5&page=1`,
      { method: 'GET', headers: crmHeaders }
    ),
    2000,
    'Custom fields fetching'
  );
  const data = await handleResponse(response, 'Custom fields fetching');
  return data;
};

const postAssignDevices = async (serviceId, deviceIds, subscriptionId) => {
  const updatedDevices = deviceIds.map(device => ({
    ...device,
    action: 'ENABLE',
  }));
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/services/${serviceId}/devices`, {
      method: 'POST',
      headers: crmHeaders,
      body: JSON.stringify(updatedDevices),
    }),
    2000,
    'Device assignment'
  );
  const data = await handleResponse(response, 'Device assignment');
  const customFields = await getCustomFields(subscriptionId);
  return {
    deviceIds: data,
    customFields: customFields || null,
  };
};

const getAssignDevices = async (contactId, deviceIds, subscriptionId) => {
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/services`, {
      method: 'GET',
      headers: crmHeaders
    }),
    2000,
    'Services fetching for device assignment'
  );
  const data = await handleResponse(response, 'Services fetching for device assignment');
  if (data.content?.length) {
    const assignedDevicesData = await postAssignDevices(data.content[0]?.id, deviceIds, subscriptionId);
    return {
      deviceIds: assignedDevicesData.deviceIds || [],
      customFields: assignedDevicesData.customFields || null,
    };
  }
  return { deviceIds: null, customFields: null };
};

const postAddSubscriptionDevice = async (subscriptionId, deviceIds, contactId) => {
  if (deviceIds.length > 1) {
    console.warn('Multiple deviceIds provided; using first one:', deviceIds);
  }
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/subscriptions/${subscriptionId}/devices`, {
      method: 'POST',
      headers: crmHeaders,
      body: JSON.stringify(deviceIds[0]),
    }),
    2000,
    'Subscription device addition'
  );
  const data = await handleResponse(response, 'Subscription device addition');
  if (data.id) {
    const assignedDevicesData = await getAssignDevices(contactId, deviceIds, subscriptionId);
    return {
      deviceIds: assignedDevicesData.deviceIds || [],
      customFields: assignedDevicesData.customFields || null,
    };
  }
  return { deviceIds: [], customFields: null };
};

const getAllowedDevices = async (subscriptionId, contactId) => {
  const response = await withTimeout(
    async () => fetch(
      `${CONFIG.CRM_BASE_URL}/subscriptions/${subscriptionId}/allowed_devices?size=50&page=1&search_value=`,
      { method: 'GET', headers: crmHeaders }
    ),
    2000,
    'Allowed devices fetching'
  );
  const data = await handleResponse(response, 'Allowed devices fetching');
  if (data.content?.length) {
    const deviceIds = data.content.map(item => ({ device_id: item.device.id }));
    const assignedDevicesData = await postAddSubscriptionDevice(subscriptionId, deviceIds, contactId);
    return {
      deviceIds: assignedDevicesData.deviceIds || [],
      customFields: assignedDevicesData.customFields || null,
    };
  }
  return { deviceIds: [], customFields: null };
};


const getSubscriptionDetails = async (contactId, payload) => {
  const response = await withTimeout(
    async () => fetch(`${CONFIG.CRM_BASE_URL}/contacts/${contactId}/subscriptions`, {
      method: 'GET',
      headers: crmHeaders,
    }),
    2000,
    'Subscription fetching'
  );
  const data = await handleResponse(response, 'Subscription fetching');
  if (data.content?.length) {
    const subscriptionId = data.content[0].id;
    const allowedDevices = await getAllowedDevices(subscriptionId, contactId);
    return {
      subscription_id: subscriptionId,
      state: data.content[0].state,
      device_ids: allowedDevices.deviceIds || [],
      custom_fields: allowedDevices.customFields || null,
      firstname: payload?.first_name || '',
      lastname: payload?.last_name || '',
      number: payload?.number || '',
    };
  }
  return {
    subscription_id: null,
    device_ids: [],
    custom_fields: null,
    firstname: payload?.first_name || '',
    lastname: payload?.last_name || '',
    number: payload?.number || '',
  };
};

// Main controller function for /subscribe route
const handleSubscribe = async (req, res) => {
  try {
    validatePayload(req.body);

    const phoneNumber = req.body?.number;
    const existingContactCheck = await checkExistingContact(phoneNumber, req.body);

    // Case 1: Contact exists with Dhiraagu OTT tag
    if (existingContactCheck.status === '200') {
      const { subscribed, id, subscriptionDetails } = existingContactCheck.data;
      const contactId = id;

      if (subscribed) {
        // Already ACTIVE → stop
        return res.status(200).json(existingContactCheck);
      } else {
        // Contact has OTT tag but subscription is not ACTIVE

        const accountData = await fetchAccounts(contactId);
        const newSubscriptionDetails = await getSubscriptionDetails(contactId, req.body);

        if (newSubscriptionDetails.state === 'INACTIVE') {
          // Reactivate existing subscription
          await createPayment(contactId, req.body.payment_ref, accountData.id);

          return res.status(200).json({
            status: '201',
            message: 'Subscription re-activated',
            data: {
              id: uuidv4(),
              firstname: newSubscriptionDetails.firstname,
              lastname: newSubscriptionDetails.lastname,
              tag: 'Dhiraagu OTT',
              number: newSubscriptionDetails.number,
              subscribed: true,
            },
          });
        } else if (newSubscriptionDetails.state === 'CHURNED'){
          // Create new subscription flow
          await createPayment(contactId, req.body.payment_ref, accountData.id);
          await createSubscription(contactId, accountData.id);

          const updatedSubscription = await getSubscriptionDetails(contactId, req.body);

          return res.status(201).json({
            status: '201',
            message: 'New subscription created',
            data: {
              id: uuidv4(),
              firstname: updatedSubscription.firstname,
              lastname: updatedSubscription.lastname,
              tag: 'Dhiraagu OTT',
              number: updatedSubscription.number,
              subscribed: updatedSubscription.state === 'ACTIVE',
            },
          });
        }
        
        else {
          // Create new subscription flow
          await registerDevice(contactId);
          await createPayment(contactId, req.body.payment_ref, accountData.id);
          await createSubscription(contactId, accountData.id);

          const updatedSubscription = await getSubscriptionDetails(contactId, req.body);

          return res.status(201).json({
            status: '201',
            message: 'New subscription created',
            data: {
              id: uuidv4(),
              firstname: updatedSubscription.firstname,
              lastname: updatedSubscription.lastname,
              tag: 'Dhiraagu OTT',
              number: updatedSubscription.number,
              subscribed: updatedSubscription.state === 'ACTIVE',
            },
          });
        }
      }
    }

    // Case 2: Contact exists but no OTT tag → stop
    if (existingContactCheck.status === '409') {
      return res.status(409).json(existingContactCheck);
    }

    // Case 3: Contact not found → full subscription process
    if (existingContactCheck.status === '404') {
      console.log('Contact not found. Proceeding with contact creation...');
    }

    // Normal flow for new contact
    const result = await withTimeout(async () => {
      const contactData = await createContact(req.body);
      const contactId = contactData.id;

      await registerContactTag(contactId);
      await registerDevice(contactId);
      const accountData = await createAccount(contactId);
      await createPayment(contactId, req.body.payment_ref, accountData.id);
      await createSubscription(contactId, accountData.id);

      const subscriptionDetails = await getSubscriptionDetails(contactId, req.body);

      return {
        status: '201',
        message: 'success',
        data: {
          id: uuidv4(),
          firstname: subscriptionDetails.firstname,
          lastname: subscriptionDetails.lastname,
          tag: 'Dhiraagu OTT',
          number: subscriptionDetails.number,
          subscribed: subscriptionDetails.state === 'ACTIVE',
        },
      };
    }, 14000, 'Subscription process');

    return res.status(200).json(result);

  } catch (error) {
    console.error('Subscription process error:', error);
    const statusCode =
      error.message.includes('Invalid') || error.message.includes('failed') ? 400 : 500;
    return res.status(statusCode).json({
      status: statusCode.toString(),
      message: error.message || 'Internal server error',
      data: null,
    });
  }
};



module.exports = {
    getContactDetails,
    handleSubscribe
};