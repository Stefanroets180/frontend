const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8080/api/v1';
const RECEIPT_IMAGE_PATH = '/Users/stefanroets/WebstormProjects/TAX-FUEL/1expense-tracking-app/frontend/test123.jpg';

// Vehicle IDs from database with current odometer readings
const VEHICLES = [
  { id: '1a5a214c-2971-4409-b983-72849019dfd4', name: 'VW Golf TDI', reg: 'AS 123 XT GP', currentOdometer: 130750 },
  { id: '8e03d31b-7504-427f-9016-cdee8d3b353a', name: 'Peugeot 208', reg: 'CZ 69 LD GP', currentOdometer: 130750 }
];

// Login credentials from database
const LOGIN_CREDENTIALS = {
  email: 'stefan1@test.com',
  password: 'test1234'
};

let authToken = '';

// Helper function to login and get token
async function login() {
  console.log('Logging in...');
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN_CREDENTIALS)
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const data = await response.json();
  authToken = data.accessToken;
  console.log('Login successful!');
  return data;
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, method = 'GET', body = null, isMultipart = false) {
  const headers = isMultipart ? {} : { 'Content-Type': 'application/json' };
  headers['Authorization'] = `Bearer ${authToken}`;
  
  const options = {
    method,
    headers
  };
  
  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Helper function to create FormData with receipt image
function createFormDataWithReceipt(dataJson) {
  const formData = new FormData();
  formData.append('data', JSON.stringify(dataJson));
  
  if (fs.existsSync(RECEIPT_IMAGE_PATH)) {
    const imageBuffer = fs.readFileSync(RECEIPT_IMAGE_PATH);
    formData.append('receipt', new Blob([imageBuffer], { type: 'image/jpeg' }), 'test123.jpg');
  } else {
    console.warn(`Receipt image not found at ${RECEIPT_IMAGE_PATH}`);
  }
  
  return formData;
}

// Helper function to create simple JSON data (no multipart)
function createJsonData(dataJson) {
  return dataJson;
}

// Add fuel expense
async function addFuelExpense(vehicle, date, liters, pricePerLiter, odometer, stationName = 'Shell') {
  console.log(`Adding fuel expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const fuelExpenseData = {
    vehicleId: vehicle.id,
    expenseDate: date,
    amountZar: (liters * pricePerLiter).toFixed(2),
    totalCost: (liters * pricePerLiter).toFixed(2),
    description: `Fuel at ${stationName}`,
    fuelType: 'DIESEL_50PPM',
    liters: liters,
    pricePerLiter: pricePerLiter,
    fullTank: true,
    stationName: stationName,
    stationLocation: 'Johannesburg',
    odometerReading: odometer,
    isBaselineFill: false,
    gpsLatitude: -26.2041,
    gpsLongitude: 28.0473,
    gpsAccuracyMeters: 10.5
  };
  
  const formData = createFormDataWithReceipt(fuelExpenseData);
  
  const result = await apiCall('/expenses/fuel', 'POST', formData, true);
  console.log(`✓ Fuel expense added: R${(liters * pricePerLiter).toFixed(2)}`);
  return result;
}

// Add tyre expense
async function addTyreExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding tyre expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const tyreExpenseData = {
    vehicleId: vehicle.id,
    date: date,
    amount: amount,
    supplierName: 'Tyreright',
    description: 'Tyre Purchase',
    brand: 'Continental',
    model: 'ContiSportContact 5',
    size: '205/55R16',
    quantity: 2,
    position: 'Front',
    odometerReading: odometer,
    treadDepthMm: 8.0,
    expectedLifespanKm: 50000,
    rotationIntervalKm: 8000,
    warrantyKm: 80000,
    notes: isExpired ? 'Old tyres - need replacement' : 'New tyres installed'
  };
  
  try {
    const formData = createFormDataWithReceipt(tyreExpenseData);
    const result = await apiCall('/expenses/tyres', 'POST', formData, true);
    console.log(`✓ Tyre expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  } catch (error) {
    console.error(`Failed to add tyre expense: ${error.message}`);
    // Try adding as a simple expense instead
    console.log('Attempting to add as simple expense instead...');
    const simpleExpenseData = {
      vehicleId: vehicle.id,
      category: 'TIRES',
      amountZar: amount,
      expenseDate: date,
      supplierName: 'Tyreright',
      description: 'Tyre Purchase',
      odometerReading: odometer,
      invoiceNumber: 'TYRE' + Date.now(),
      isRecurring: false,
      isTaxDeductible: true,
      extraFields: JSON.stringify({
        brand: 'Continental',
        model: 'ContiSportContact 5',
        size: '205/55R16',
        quantity: 2,
        position: 'Front',
        purchaseOdometer: odometer,
        treadDepthMm: 8.0,
        expectedLifespanKm: 50000,
        rotationIntervalKm: 8000,
        warrantyKm: 80000,
        notes: isExpired ? 'Old tyres - need replacement' : 'New tyres installed'
      })
    };
    const result = await apiCall('/expenses', 'POST', simpleExpenseData, false);
    console.log(`✓ Tyre expense added as simple expense: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  }
}

// Add license expense
async function addLicenseExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding license expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const today = new Date();
  const expiryDate = isExpired 
    ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const licenseExpenseData = {
    vehicleId: vehicle.id,
    date: date,
    amount: amount,
    supplierName: 'Post Office',
    description: 'Vehicle License Renewal',
    licenseNumber: vehicle.reg,
    registrationNumber: vehicle.reg,
    licenseType: 'VEHICLE_LICENSE',
    issueDate: date,
    expiryDate: expiryDate,
    renewalFeeZar: amount,
    penaltiesZar: 0,
    arrearsZar: 0,
    transactionNumber: 'TXN' + Date.now(),
    renewalMethod: 'POST_OFFICE',
    processingDays: 7,
    testingCenter: 'Post Office',
    notes: isExpired ? 'License expired - renewal required' : 'License renewed'
  };
  
  const formData = createFormDataWithReceipt(licenseExpenseData);
  
  try {
    const result = await apiCall('/expenses/license', 'POST', formData, true);
    console.log(`✓ License expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  } catch (error) {
    console.error(`Failed to add license expense: ${error.message}`);
    // Try as simple expense
    const simpleExpenseData = {
      vehicleId: vehicle.id,
      category: 'LICENSE_RENEWAL',
      amountZar: amount,
      expenseDate: date,
      supplierName: 'Post Office',
      description: 'Vehicle License Renewal',
      odometerReading: odometer,
      invoiceNumber: 'LIC' + Date.now(),
      isRecurring: false,
      isTaxDeductible: true,
      extraFields: JSON.stringify({
        licenseNumber: vehicle.reg,
        registrationNumber: vehicle.reg,
        licenseType: 'VEHICLE_LICENSE',
        issueDate: date,
        expiryDate: expiryDate,
        renewalFeeZar: amount,
        penaltiesZar: 0,
        arrearsZar: 0,
        transactionNumber: 'TXN' + Date.now(),
        renewalMethod: 'POST_OFFICE',
        processingDays: 7,
        testingCenter: 'Post Office',
        notes: isExpired ? 'License expired - renewal required' : 'License renewed'
      })
    };
    const result = await apiCall('/expenses', 'POST', simpleExpenseData, false);
    console.log(`✓ License expense added as simple expense: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  }
  console.log(`✓ License expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
  return result;
}

// Add insurance expense
async function addInsuranceExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding insurance expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const today = new Date();
  const startDate = date;
  const endDate = isExpired
    ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const insuranceExpenseData = {
    vehicleId: vehicle.id,
    date: date,
    amount: amount,
    supplierName: 'OUTsurance',
    description: 'Insurance Premium',
    insuranceProvider: 'OUTsurance',
    policyNumber: 'POL' + vehicle.reg.replace(/\s/g, ''),
    coverageType: 'COMPREHENSIVE',
    policyStartDate: startDate,
    policyEndDate: endDate,
    premiumAmountZar: amount,
    excessAmountZar: 5000,
    vehicleValueZar: 250000,
    paymentFrequency: 'MONTHLY',
    notes: isExpired ? 'Insurance expired - renewal required' : 'Insurance active'
  };
  
  const formData = createFormDataWithReceipt(insuranceExpenseData);
  
  try {
    const result = await apiCall('/expenses/insurance', 'POST', formData, true);
    console.log(`✓ Insurance expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  } catch (error) {
    console.error(`Failed to add insurance expense: ${error.message}`);
    // Try as simple expense
    const simpleExpenseData = {
      vehicleId: vehicle.id,
      category: 'INSURANCE_PREMIUM',
      amountZar: amount,
      expenseDate: date,
      supplierName: 'OUTsurance',
      description: 'Insurance Premium',
      odometerReading: odometer,
      invoiceNumber: 'INS' + Date.now(),
      isRecurring: false,
      isTaxDeductible: true,
      extraFields: JSON.stringify({
        insuranceProvider: 'OUTsurance',
        policyNumber: 'POL' + vehicle.reg.replace(/\s/g, ''),
        coverageType: 'COMPREHENSIVE',
        policyStartDate: startDate,
        policyEndDate: endDate,
        premiumAmountZar: amount,
        excessAmountZar: 5000,
        vehicleValueZar: 250000,
        paymentFrequency: 'MONTHLY',
        notes: isExpired ? 'Insurance expired - renewal required' : 'Insurance active'
      })
    };
    const result = await apiCall('/expenses', 'POST', simpleExpenseData, false);
    console.log(`✓ Insurance expense added as simple expense: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  }
  console.log(`✓ Insurance expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
  return result;
}

// Add tracking expense
async function addTrackingExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding tracking expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const today = new Date();
  const startDate = date;
  const endDate = isExpired
    ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const trackingExpenseData = {
    vehicleId: vehicle.id,
    date: date,
    amount: amount,
    supplierName: 'Tracker',
    description: 'Vehicle Tracking Subscription',
    providerName: 'Tracker',
    subscriptionType: 'MONTHLY',
    monthlyFeeZar: amount,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    deviceSerialNumber: 'TRK' + vehicle.reg.replace(/\s/g, ''),
    deviceType: 'GPS Tracker',
    installationDate: startDate,
    installationFeeZar: 1500,
    contractDurationMonths: 12,
    appLoginEmail: 'tracking@example.com',
    supportPhone: '0871234567',
    features: 'GPS tracking, geofencing, emergency response',
    notes: isExpired ? 'Tracking contract expired - renewal required' : 'Tracking active'
  };
  
  const formData = createFormDataWithReceipt(trackingExpenseData);
  
  try {
    const result = await apiCall('/expenses/tracking', 'POST', formData, true);
    console.log(`✓ Tracking expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  } catch (error) {
    console.error(`Failed to add tracking expense: ${error.message}`);
    // Try as simple expense
    const simpleExpenseData = {
      vehicleId: vehicle.id,
      category: 'VEHICLE_TRACKING',
      amountZar: amount,
      expenseDate: date,
      supplierName: 'Tracker',
      description: 'Vehicle Tracking Subscription',
      odometerReading: odometer,
      invoiceNumber: 'TRK' + Date.now(),
      isRecurring: false,
      isTaxDeductible: true,
      extraFields: JSON.stringify({
        providerName: 'Tracker',
        subscriptionType: 'MONTHLY',
        monthlyFeeZar: amount,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        deviceSerialNumber: 'TRK' + vehicle.reg.replace(/\s/g, ''),
        deviceType: 'GPS Tracker',
        installationDate: startDate,
        installationFeeZar: 1500,
        contractDurationMonths: 12,
        appLoginEmail: 'tracking@example.com',
        supportPhone: '0871234567',
        features: 'GPS tracking, geofencing, emergency response',
        notes: isExpired ? 'Tracking contract expired - renewal required' : 'Tracking active'
      })
    };
    const result = await apiCall('/expenses', 'POST', simpleExpenseData, false);
    console.log(`✓ Tracking expense added as simple expense: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  }
  console.log(`✓ Tracking expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
  return result;
}

// Add roadworthy expense
async function addRoadworthyExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding roadworthy expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const today = new Date();
  const expiryDate = isExpired
    ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const roadworthyExpenseData = {
    vehicleId: vehicle.id,
    date: date,
    amount: amount,
    supplierName: 'AA Test Centre',
    description: 'Roadworthy Certificate',
    testingStationName: 'AA Test Centre',
    testingStationAddress: '123 Main St, Johannesburg',
    testingStationPhone: '0111234567',
    testDate: date,
    expiryDate: expiryDate,
    certificateNumber: 'RW' + Date.now(),
    testResult: 'PASS',
    testFeeZar: amount,
    retestFeeZar: 0,
    inspectorName: 'John Doe',
    vehicleOdometer: odometer,
    vehicleRegistration: vehicle.reg,
    failureReasons: '',
    conditionsApplied: '',
    notes: isExpired ? 'Roadworthy expired - retest required' : 'Roadworthy valid'
  };
  
  const formData = createFormDataWithReceipt(roadworthyExpenseData);
  
  try {
    const result = await apiCall('/expenses/roadworthy', 'POST', formData, true);
    console.log(`✓ Roadworthy expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  } catch (error) {
    console.error(`Failed to add roadworthy expense: ${error.message}`);
    // Try as simple expense
    const simpleExpenseData = {
      vehicleId: vehicle.id,
      category: 'ROADWORTHY',
      amountZar: amount,
      expenseDate: date,
      supplierName: 'AA Test Centre',
      description: 'Roadworthy Certificate',
      odometerReading: odometer,
      invoiceNumber: 'RW' + Date.now(),
      isRecurring: false,
      isTaxDeductible: true,
      extraFields: JSON.stringify({
        testingStationName: 'AA Test Centre',
        testingStationAddress: '123 Main St, Johannesburg',
        testingStationPhone: '0111234567',
        testDate: date,
        expiryDate: expiryDate,
        certificateNumber: 'RW' + Date.now(),
        testResult: 'PASS',
        testFeeZar: amount,
        retestFeeZar: 0,
        inspectorName: 'John Doe',
        vehicleOdometer: odometer,
        vehicleRegistration: vehicle.reg,
        failureReasons: '',
        conditionsApplied: '',
        notes: isExpired ? 'Roadworthy expired - retest required' : 'Roadworthy valid'
      })
    };
    const result = await apiCall('/expenses', 'POST', simpleExpenseData, false);
    console.log(`✓ Roadworthy expense added as simple expense: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
    return result;
  }
  console.log(`✓ Roadworthy expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
  return result;
}

// Add service expense
async function addServiceExpense(vehicle, date, amount, odometer, isExpired = false) {
  console.log(`Adding service expense for ${vehicle.name} (${vehicle.reg})...`);
  
  const today = new Date();
  const nextServiceDate = isExpired
    ? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
    : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const serviceExpenseData = {
    vehicleId: vehicle.id,
    category: 'MECHANIC_SERVICE',
    amountZar: amount,
    expenseDate: date,
    supplierName: 'BMW Midrand',
    description: 'Major Service',
    odometerReading: odometer,
    invoiceNumber: 'INV' + Date.now(),
    isRecurring: false,
    isTaxDeductible: true,
    extraFields: JSON.stringify({
      serviceType: 'MAJOR_SERVICE',
      workshopName: 'BMW Midrand',
      workshopPhone: '0111234567',
      workshopAddress: '123 Main St, Midrand',
      technicianName: 'John Smith',
      laborCostZar: 1500,
      partsCostZar: 2000,
      workDescription: 'Full major service including oil change, filter replacement, and brake inspection',
      partsReplaced: 'Oil filter, air filter, brake pads',
      warrantyMonths: 12,
      nextServiceDueKm: odometer + 15000,
      nextServiceDueDate: nextServiceDate,
      notes: isExpired ? 'Service overdue - immediate attention required' : 'Service completed successfully'
    })
  };
  
  const result = await apiCall('/expenses', 'POST', serviceExpenseData, false);
  console.log(`✓ Service expense added: R${amount.toFixed(2)} (${isExpired ? 'EXPIRED' : 'WARNING'})`);
  return result;
}

// Main function to add all expenses
async function addAllExpenses() {
  try {
    // Login
    const userData = await login();
    console.log(`Logged in as: ${userData.firstName} ${userData.lastName}`);
    console.log('');
    
    const today = new Date();
    
    for (const vehicle of VEHICLES) {
      console.log(`\n=== Adding expenses for ${vehicle.name} (${vehicle.reg}) ===`);
      console.log(`Current odometer: ${vehicle.currentOdometer} km`);
      
      // Calculate realistic odometer progressions
      // Starting from current odometer and going back in time
      const baseOdometer = vehicle.currentOdometer;
      
      // Fuel expenses - realistic progression (every ~500km)
      // Most recent fill
      await addFuelExpense(vehicle, today.toISOString().split('T')[0], 45.5, 19.50, baseOdometer, 'Shell');
      // 1 month ago
      await addFuelExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split('T')[0], 42.0, 20.10, baseOdometer - 520, 'Engen');
      // 2 months ago
      await addFuelExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()).toISOString().split('T')[0], 38.5, 19.80, baseOdometer - 1040, 'BP');
      // 3 months ago
      await addFuelExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()).toISOString().split('T')[0], 44.0, 19.95, baseOdometer - 1560, 'Shell');
      
      // Tyre expenses - realistic purchase odometers
      // Recent tyre purchase (warning - approaching rotation interval)
      await addTyreExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 2, today.getDate()).toISOString().split('T')[0], 2500, baseOdometer - 7500, false);
      // Old tyre purchase (expired - needs rotation/replacement)
      await addTyreExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth() + 6, today.getDate()).toISOString().split('T')[0], 2200, baseOdometer - 15500, true);
      
      // License expenses
      // Recent license renewal (warning - approaching expiry)
      await addLicenseExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 10, today.getDate()).toISOString().split('T')[0], 650, baseOdometer - 5200, false);
      // Old license renewal (expired)
      await addLicenseExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth() - 2, today.getDate()).toISOString().split('T')[0], 600, baseOdometer - 12480, true);
      
      // Insurance expenses
      // Recent insurance (warning - approaching renewal)
      await addInsuranceExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 11, today.getDate()).toISOString().split('T')[0], 1200, baseOdometer - 5720, false);
      // Old insurance (expired)
      await addInsuranceExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth() - 1, today.getDate()).toISOString().split('T')[0], 1100, baseOdometer - 12480, true);
      
      // Tracking expenses
      // Recent tracking (warning - approaching renewal)
      await addTrackingExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 11, today.getDate()).toISOString().split('T')[0], 299, baseOdometer - 5720, false);
      // Old tracking (expired)
      await addTrackingExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth() - 1, today.getDate()).toISOString().split('T')[0], 250, baseOdometer - 12480, true);
      
      // Roadworthy expenses
      // Recent roadworthy (warning - approaching expiry)
      await addRoadworthyExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 20, today.getDate()).toISOString().split('T')[0], 450, baseOdometer - 10400, false);
      // Old roadworthy (expired)
      await addRoadworthyExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth() - 6, today.getDate()).toISOString().split('T')[0], 400, baseOdometer - 12480, true);
      
      // Service expenses
      // Recent service (warning - approaching next service)
      await addServiceExpense(vehicle, new Date(today.getFullYear(), today.getMonth() - 5, today.getDate()).toISOString().split('T')[0], 3500, baseOdometer - 3500, false);
      // Old service (expired - overdue for service)
      await addServiceExpense(vehicle, new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().split('T')[0], 3200, baseOdometer - 15000, true);
      
      console.log(`\n✓ All expenses added for ${vehicle.name}`);
    }
    
    console.log('\n=== All expenses added successfully! ===');
  } catch (error) {
    console.error('Error adding expenses:', error.message);
    process.exit(1);
  }
}

// Run the script
addAllExpenses();
