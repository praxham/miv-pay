# MIV-PAY: Generate, Share and Verify Secure UPI Payment Links

Mivpay is a lightweight, secure application built with Remix that generates and verifies cryptographically signed payment links. It is designed to solve a specific problem: bypassing the current restrictions that block standard UPI deep links for unverified or normal users.

Instead of relying on deep links, Mivpay generates a dynamic UPI QR code when the payment link is opened. It also provides a seamless option to share this QR code as an image directly to UPI apps, ensuring a smooth checkout experience for customers without requiring merchant verification.

## The Individual Payment Flow

This flow covers the direct experience when a link creator manually generates and shares a standalone payment link with a customer.

```
[ Link Creator ]
     │
     ▼
[ Mivpay Payment Page ] ── Generates Secure Payment Link and Sends it to Customer
     │
     ▼
[ Customer's UPI App ] ◄── Customer scans QR (on Desktop) or uses the "Share QR Code" option
     │                     (on mobile) to scan or send QR code to UPI app to initiate payment
     │
     ▼
[ Bank / UPI Network ] ─── Transaction succeeds; Customer receives a UTR (12-digit reference)
     │
     ▼
[ Mivpay Payment Page ] ◄── Customer manually enters the UTR and clicks "Confirm Payment"
     │
     ▼
[ Auto-Opens Contact ] ─── Mivpay auto-triggers window.open() for WhatsApp/Email (using `ct` and `ci`)
     │                     with a pre-filled message containing the UTR
     │
     ▼
[ Customer's App ] ◄────── Customer hits "Send" to message the link creator
     │
     ▼
[ Link Creator ] ───────── Receives message with UTR for easy manual verification in bank app
```

## The Payment Gateway Integration Flow

This flow explains how to integrate Mivpay as a custom payment gateway into your existing e-commerce website using browser window communication (postMessage).

```
[ E-commerce Website ]                 [ Mivpay Server/Tab ]                       [ Customer ]
         │                                      │                                       │
         │ 1. POST /api/generate-link           │                                       │
         │    (Payload includes: vurl, ct, ci)  │                                       │
         │─────────────────────────────────────►│                                       │
         │                                      │                                       │
         │ 2. Returns Signed Payment Link       │                                       │
         │◄─────────────────────────────────────│                                       │
         │                                      │                                       │
         │ 3. window.open(Payment Link)         │                                       │
         │──────────────────────────────────────┼──────────────────────────────────────►│
         │                                      │                                       │
         │ 4. Listen for postMessage            │                                       │
         │    (Validates origin, creates order) │   5. Customer pays via UPI & gets UTR │
         │                                      │◄──────────────────────────────────────│
         │                                      │                                       │
         │                                      │   6. Customer enters UTR & clicks     │
         │                                      │      "Confirm Payment" (Single Button)│
         │                                      │◄──────────────────────────────────────│
         │                                      │                                       │
         │ 7. postMessage({ utr: '...' })       │ 8. Auto-triggers window.open() for    │
         │◄─────────────────────────────────────│    WhatsApp/Email with `vurl?utr=...` │
         │                                      │──────────────────────────────────────►│
         │ 9. Save UTR to Order DB              │                                       │
         │──────────────────────────────────────┤   10. Customer hits "Send" in their   │
                                                │       Email/WA app to message Admin   │
[ Website Owner / Admin (Email/WhatsApp) ] ◄────┼───────────────────────────────────────┘
         │                                                                              │
         │ 11. Receives message from customer                                           │
         │     containing: vurl?utr=1234567890                                          │
         │                                                                              │
         │ 12. Taps link, opens E-com UI,                                               │
         │     and manually updates status                                              │
         │──────────────────────────────────────────────────────────────────────────────┤
```

## Step-by-Step Gateway Integration Guide:

1. Provide Params: Your e-commerce backend calls /api/generate-link, passing your custom vurl, the ct (contactType: email or whatsapp), and the ci (contactInformation: your admin email or phone number).

2. Securely Listen & Create Order: In your frontend checkout component, implement a useEffect hook to listen for the message event coming from the Mivpay tab. This function does three critical things:

   Validates Origin: It strictly checks that event.origin matches [https://miv-pay.vercel.app](https://miv-pay.vercel.app) to prevent security vulnerabilities.

   Processes the Order: Once the origin is verified, it extracts data.utr and immediately sends a POST request to your backend (e.g., /order/) combining the UTR with the cart/artifact details to create the order in your database.

   Cleans Up: It removes the event listener when the component unmounts to prevent memory leaks.

3. Customer Action: You open the signed Mivpay link in a new tab. The customer completes the UPI payment on their device, gets their UTR, and types it into the Mivpay tab.

4. The "Confirm Payment" Trigger: There is only one button on the Mivpay UI. When the customer clicks "Confirm Payment", Mivpay simultaneously executes two actions:

   Pass UTR Back: It triggers window.opener.postMessage({ utr: '...' }, '\*') to send the UTR back to your active e-commerce checkout tab (caught by the listener in Step 2).

   Auto-Open Contact App: It automatically calls window.open using the provided ct and ci. This directly opens the customer's WhatsApp or Email client with a pre-written message containing your vurl?utr={utr}.

5. Customer Sends Notification: The customer's messaging app is now open and ready. They simply hit "Send" to deliver the message to you.

6. Manual Admin Update: You (the website owner) receive the message directly from the customer. You tap the vurl link in that message, verify the payment in your bank, and use your own site's UI to mark the order as complete.

## API Endpoints

### 1. Generate Link

- **URL**: `/api/generate-link`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:

  ```json
  {
    "pa": "payee@bank",
    "am": 500,
    "pn": "Payee Name",
    "tn": "Test Payment",
    "ct": "whatsapp",
    "ci": "9876543210",
    "ra": "receiver@bank",
    "vurl": "https://your-store.com/admin/orders"
  }

  Response (200 OK):
  JSON

    {
      "success": true,
      "message": "Successfully Generated Secure Payment Link",
      "data": {
        "link": "https://miv-pay.vercel.app/pay/?pa=payee@bank&am=500&pn=Payee+Name&tn=Test+Payment&ct=whatsapp&ci=9876543210&ra=receiver@bank&vurl=https://your-store.com/admin/orders&sig=..."
      }
    }
  ```

**(ct, ci, pn, tn, ra, vurl are optional, ct: "whatsapp" | "email",)**

### 2. Verify Link

- **URL**: `/api/verify-link`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:

  ```json
  {
    "pa": "payee@bank",
    "am": 500,
    "pn": "Payee Name",
    "tn": "Test Payment",
    "ct": "whatsapp",
    "ci": "9876543210",
    "ra": "receiver@bank",
    "vurl": "https://your-store.com/admin/orders",
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

**(ct, ci, pn, tn, ra, vurl are optional, ct: "whatsapp" | "email",)**

ecom integration example:

1. https://github.com/praxham/madeinvikhroli/commit/8b5f9a6e7a4cf36faa1b3c83aae7f7352b31e091 (commit 1/2)
2. https://github.com/praxham/madeinvikhroli/commit/78518aa9acbe502b88ac7070668993fb742c9ff8 (commit 2/2)
