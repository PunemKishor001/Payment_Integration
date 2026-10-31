# SauceDemo + Razorpay Test Mode (local QA practice)

This is a local integration of the uploaded SauceDemo sample app with the uploaded Razorpay Express backend. It does not modify the public saucedemo.com website.

## Requirements
- Node.js and npm
- Python (for serving the built static files, if desired)
- Razorpay account with **Test Mode** API keys

## 1. Configure Razorpay backend
1. Open a terminal in `backend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and enter your Razorpay **Test Mode** key ID and secret.
4. Run `node app.js`. Keep this terminal open. Backend uses `http://localhost:5000`.

PowerShell:
```powershell
cd backend
npm install
Copy-Item .env.example .env
notepad .env
node app.js
```

## 2. Build SauceDemo frontend
Open a second terminal in `saucedemo`:
```powershell
cd saucedemo
npm install
npm run build
```
The built site is generated in `dist`. This is an older Webpack 4 project and may have compatibility issues with newer Node versions. If the build fails on Node 24, use Node 18 LTS or use the static source files only after building with a compatible environment.

## 3. Serve the built site
Open a third terminal:
```powershell
cd saucedemo/dist
python -m http.server 5500
```
Open `http://localhost:5500/`.

Test login (from the original SauceDemo sample): `standard_user` / `secret_sauce`.
Add one or more products to cart, go to checkout, fill in first name, last name and postal code, continue to Checkout: Overview, then click **PAY WITH RAZORPAY**.

The Razorpay order amount is calculated from the local cart total plus tax and sent in paise. The backend creates the Razorpay order. Checkout's callback is sent to `/verifyOrder`; the server verifies the HMAC signature before redirecting to order completion.

## Notes / limitations
- Use test keys and test payment methods only. No real money is charged in Test Mode.
- This is a QA learning demo, not production-ready commerce code. For a real application, the server must calculate the price from trusted product IDs/prices and persist order/payment status in a database. Do not trust an amount supplied by the browser.
- A valid signature verifies the callback signature, but production systems should also fetch the payment/order from Razorpay or reconcile using webhooks before fulfilling an order.
- Never commit `.env` or expose `RAZORPAY_KEY_SECRET`.
