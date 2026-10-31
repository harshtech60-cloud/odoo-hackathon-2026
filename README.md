# Brightloop — Subscription Management System

<p align="center">
  <strong>A Unified Platform for Subscription Management & Recurring Billing</strong>
</p>

## About the Project

**Brightloop Subscription Manager** is a subscription management platform developed as part of the **Odoo × FLUX Hackathon**.

The project aims to simplify and automate the complete subscription lifecycle for businesses — from managing customers and creating subscription plans to generating invoices, tracking payments and monitoring recurring revenue.

Our proposed solution brings essential business operations into one centralized dashboard, reducing manual work, minimizing billing errors and making financial information easier to manage.

## The Problem

Businesses that operate on subscription models often face challenges such as:

- Managing customer subscriptions through spreadsheets.
- Missing subscription renewals and expiry dates.
- Creating recurring invoices manually.
- Matching payments with invoices.
- Managing discounts, taxes and product pricing.
- Preparing revenue reports manually.
- Tracking outstanding and overdue payments.

These disconnected processes consume time and make it difficult for businesses to understand their actual recurring revenue.

## Our Solution

Brightloop aims to provide a centralized system where administrators and staff can manage subscription operations efficiently while customers can access their own subscription and invoice information.

The platform is designed around a connected workflow:

**Customer → Product → Plan → Subscription → Invoice → Payment → Revenue Report**

## Key Modules

The application is planned to include the following modules:

### 1. User Management
- Customer registration and login.
- Role-based access control.
- Admin, Staff and Customer roles.
- Secure password handling.
- Password reset functionality.

### 2. Product & Plan Management
- Create and manage products.
- Configure product types, prices and variants.
- Set minimum quantities.
- Create daily, weekly, monthly and yearly billing plans.
- Configure plan availability and renewal options.

### 3. Subscription Management
- Create and manage customer subscriptions.
- Generate quotations using templates.
- Track subscription status.
- Support confirmation, activation, pausing, renewal and closure.
- Monitor subscription start and expiry dates.

### 4. Invoice & Billing Management
- Generate invoices from subscriptions.
- Calculate product quantities, taxes and totals.
- Manage invoice statuses.
- Prevent duplicate billing.
- View and print invoices.

### 5. Discount Management
- Configure fixed and percentage-based discounts.
- Set minimum purchase or quantity requirements.
- Define discount validity periods.
- Apply eligible discounts automatically during billing.
- Enforce discount usage limits.

### 6. Payment Management
- Record payments against invoices.
- Support different payment methods.
- Track paid and outstanding amounts.
- Identify overdue invoices.

### 7. Reports & Analytics
- Monitor active subscriptions.
- Track monthly recurring revenue (MRR).
- Calculate annual recurring revenue (ARR).
- Monitor collected revenue and outstanding dues.
- View overdue invoices.
- Filter and analyse business performance.

## Technology Stack

| Technology | Purpose |
|---|---|
| Python | Application logic |
| Flask | Backend web framework |
| SQLite | Database management |
| HTML5 | Web page structure |
| CSS3 | User interface and styling |
| JavaScript | Additional frontend interactions, where needed |
| Git & GitHub | Version control and team collaboration |

## Project Structure

```text
odoo-hackathon-2026/
│
├── app.py
├── database.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── templates/
│   ├── dashboard.html
│   ├── customers.html
│   ├── products.html
│   ├── plans.html
│   ├── subscriptions.html
│   ├── invoices.html
│   ├── payments.html
│   ├── discounts.html
│   └── reports.html
│
└── static/
    └── style.css
```

*The structure above represents the planned project organization. Additional files and modules may be added during development.*

## Getting Started

Follow these steps to run the project locally.

### Prerequisites

Make sure you have installed:

- Python 3
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/harshstech60-cloud/odoo-hackathon-2026.git
```

### 2. Navigate to the Project Folder

```bash
cd odoo-hackathon-2026
```

### 3. Create a Virtual Environment

```bash
python3 -m venv .venv
```

### 4. Activate the Virtual Environment

For macOS and Linux:

```bash
source .venv/bin/activate
```

For Windows:

```bash
.venv\Scripts\activate
```

### 5. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 6. Run the Application

```bash
python app.py
```

### 7. Open in Your Browser

Visit:

```text
http://127.0.0.1:5000/
```

**Note:** The application requires its Flask routes and corresponding HTML templates to be present before all pages can run successfully.

## Team Collaboration

This project is developed by a two-member team.

| Team Member | Primary Responsibility |
|---|---|
| Suraj | Frontend Development, UI/UX and HTML/CSS |
| Harsh | Backend Development, Python, Flask and Database |

Both members collaborate on integration, testing, debugging and project documentation.

GitHub is used for version control and sharing project updates.

## Development Roadmap

The project is being developed incrementally, following this planned sequence:

- [ ] Initial project setup and Flask configuration
- [ ] Dashboard interface
- [ ] Customer management
- [ ] Product and plan management
- [ ] Subscription lifecycle management
- [ ] Invoice generation and tax calculations
- [ ] Discount management
- [ ] Payment tracking
- [ ] Reports and analytics
- [ ] User authentication and role-based permissions
- [ ] Integration testing and performance improvements

## Project Objective

Our objective is to develop a practical, scalable and user-friendly subscription management platform that reduces manual business operations and brings recurring billing activities into one unified system.

We aim to make subscription management simpler, more transparent and more efficient for businesses.

---

**Project:** Brightloop — Subscription Management System  
**Event:** Odoo × FLUX Hackathon  
**Status:** Under Development  
**Team Size:** 2 Members

<p align="center">
  <strong>Built with curiosity, collaboration and code.</strong>
</p>
