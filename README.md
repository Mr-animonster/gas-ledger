# Gas Ledger

Build a web app for an LPG (cooking gas) distributorship to digitally maintain their statutory registers. Use Supabase (Lovable Cloud) as the backend.

LOGIN FLOW:

- A single shared login (agency ID + password) for the whole agency — not individual staff accounts.

- After login, show a role-select screen with three options: "Distributor", "Godown Staff", "Computer Staff".

- If "Distributor" is selected, require an OTP before proceeding. Generate a 6-digit OTP, store it server-side with a 5-minute expiry, and send it via SMS to a phone number stored in a `distributor_settings` table (single row, holds the distributor's registered phone number). For now, since SMS isn't wired up yet, just display the OTP on-screen in a toast/banner so I can test the flow — I'll connect a real SMS provider later.

- If a staff role is selected, go straight into the app with no OTP.

STAFF TABLE:

Create a `staff` table: id, name, role (enum: godown / computer_staff / distributor), active (boolean), created_at.

On any data-entry screen, include a "Filled By" dropdown populated from active staff matching the relevant role(s).

NAVIGATION:

After role selection, show a simple dashboard-style home screen with navigation cards for the registers relevant to that role (we'll add the actual register screens in later prompts — for now just create placeholder cards with names: "Daily Stock Register", "SQC Register", "Sales Register", "Installation & ARB Register", "Connection/SV Register", "Defective Cylinder/DPR Register", "Complaint Register", "Staff Wage Register" (Distributor only), "Inspection Log" (Distributor only)).

Use a clean, functional design — this is an operational tool used daily by staff, not a marketing site. Favor clarity and large tap targets over visual flourish, since it'll be used on phones and shared devices.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec1b6cd7-a15d-47e3-bdb5-9e3f2f3a00cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
