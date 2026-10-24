# MIV-PAY: Secure UPI Payment Link

A lightweight, secure application built with Bun to generate and verify cryptographic signature-protected payment links for this website only. When the payment link is opened, it generates a dynamic payment UPI QR code along with an option to share it to UPI apps as an image—bypassing the restriction where standard UPI deep link functionality is now restricted to verified merchants and blocked for normal users.

## API Endpoints

### 1. Generate Link

- **URL**: `/api/generate-link`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:

  ```json
  {
    "pa": "merchant@upi",
    "am": 500,
    "pn": "Merchant Name",
    "tn": "Test Payment",
    "ct": "whatsapp",
    "ci": "9876543210",
    "ra": "500"
  }

    Response (200 OK):
    JSON

    {
      "success": true,
      "message": "Successfully Generated Secure Payment Link",
      "data": {
        "link": "http://localhost:3000/pay/?pa=merchant@upi&am=500&pn=Merchant+Name&tn=Test+Payment&ct=whatsapp&ci=9876543210&ra=500&sig=..."
      }
    }
  ```

2. Verify Link

   URL: /api/verify-link

   Method: POST

   Content-Type: application/json

   ````json
   {
   "pa": "merchant@upi",
   "am": 500,
   "pn": "Merchant Name",
   "tn": "Test Payment",
   "ct": "whatsapp",
   "ci": "9876543210",
   "ra": "500",
   "sig": "..."
   }

   Response (200 OK):
   JSON

   {
   "success": true,
   "message": "Successfully Verified Secure Payment Link",
   "data": {
   "isValid": true
   }
   }
   ```
   ````

Interactive Documentation

Explore and test all endpoints interactively via Swagger UI:http://localhost:3000/docs

```

```
