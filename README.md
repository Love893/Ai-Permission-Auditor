# Permission Auditor - Jira Forge App

A comprehensive Jira Forge application that analyzes user and project permissions, detects over-privileged roles, flags dormant admins, and provides AI-powered insights for maintaining least-privilege governance and security compliance in Jira.

## 🎯 What It Solves
Role Risk Audit: Scans global permission schemes to detect over-permissioned users.

Least Privilege Analysis: Compares current roles against predefined or learned access baselines to identify excessive permissions.

Dormant Admin Detection: Flags users with elevated roles but no recent activity.

Remediation Suggestions: Provides actionable recommendations to downgrade or adjust user roles.

Group & Access Overlap Analysis: Highlights redundant access via multiple groups and enforces custom access rules.

## 🏗️ Architecture

### Backend (Forge Functions)
Project Permission Processing: Fetches and analyzes Jira projects, roles, and user permissions.

User & Role Data Aggregation: Summarizes project permissions, global permissions, and user activity.

SQS/Upload Service: Sends processed permission data to external analysis or reporting service.

Storage & Audit Trail: Tracks last scan timestamps, remediation history, and user preferences.

Frontend (Forge React App)

Jira Global Page Integration: Embedded dashboard for seamless access to permission insights.

AI Chat Interface: LLM-powered assistant for permission risk analysis and remediation guidance.

Progress & Scan Tracking: Real-time monitoring of permission scans and role audits.

Export Reports: PDF generation for audit summaries and compliance documentation.

🚀 Features
Core Functionality

Automated Permission Scanning: Processes all projects and roles in your Jira instance.

Smart Pagination & Batching: Efficiently handles large projects with thousands of issues and users.

User Activity Mapping: Tracks last login/activity per user to identify dormant admins.

Role & Permission Analysis: Detects excessive privileges and redundant group memberships.

Status & Risk Distribution: Categorizes roles by risk tier (Critical, Warning, Info).

AI Assistant

Natural Language Queries: Ask questions about access risks, compliance, or role justifications.

Policy Matching: Checks user access against org-defined rules or least-privilege baselines.

Remediation Suggestions: LLM proposes actionable changes for over-permissioned or dormant users.

Interactive Follow-ups: Intelligent conversation flow for iterative audits and explanations.

Performance & Monitoring

Large Project Detection: Alerts when projects have unusually high numbers of roles or users.

Processing Time Tracking: Monitors scan performance and efficiency.

Error Handling & Logging: Detailed audit logs and structured error reporting.

Cache Management: Optimizes API calls to Jira and reduces repeated fetches.

📋 Requirements

Node.js: Version 18+ (Forge runtime: nodejs22.x)

Forge CLI: Latest version installed and configured

Jira Cloud: Admin access required for project and permission APIs

API Keys: External service keys for SQS or advanced AI features

🛠️ Installation & Setup
1. Prerequisites
# Install Forge CLI globally
npm install -g @forge/cli

# Verify installation
forge --version

2. Project Setup
# Install project dependencies
npm install

# Install frontend dependencies
cd static/hello-world
npm install

### 3. Configuration
```bash
# Set required environment variables
export APP_RUNNER_API_KEY="your-api-key-here"
export SQS_ENDPOINT="your-sqs-endpoint-here"
```

### 4. Build & Deploy
```bash
# Build the frontend application
cd static/hello-world
npm run build

# Deploy to Forge
forge deploy

# Install in your Jira instance
forge install
```
## 🔧 Development

### Project Structure
```
├─ src/
│  ├─ utils/
│  │  └─ logger.js
│  └─ index.js
│
├─ static/
│  └─ hello-world/
│      ├─ build/
│      ├─ public/
│      └─ src/
│          ├─ components/
│          │  ├─ ChatInterface.css
│          │  ├─ ChatInterface.js
│          │  ├─ FullscreenLoader.js
│          │  └─ loader.css
│          ├─ utils/
│          ├─ App.js
│          └─ index.js
   
```

### Development Commands
```bash
# Start development server
cd static/hello-world
npm start

# Run tests (when implemented)
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

📊 Usage
1. Initial Setup

Install the AI Permission Auditor app in your Jira instance

Grant necessary permissions (read:jira-user, read:jira-work, etc.)

Configure optional integrations (Slack/Email for scheduled reports)

2. Running Audits

Navigate to the Permission Auditor global page

Click "Run Permission Audit"

Monitor progress with real-time audit status updates

Review results in the interactive dashboard with filters by project, group, or user

3. AI Assistant

Ask questions like “Why is this user flagged as risky?”

Request compliance summaries aligned with SOX/ISO frameworks

Get downgrade or remediation suggestions with justifications

Export detailed permission hygiene reports as PDF/CSV

🔒 Security & Permissions
Required Scopes

read:jira-user: Access user and group membership details

read:jira-work: Fetch project and permission scheme data

manage:jira-configuration: Access configuration for permissions

storage:app: Store remediation history and audit trails

External Access

LLM/AI Services: Risk classification, misuse explanation, remediation suggestions

Report Delivery: Slack/email for scheduled audit exports

Rate Limiting: Built-in retry and backoff for Jira API stability

📈 Monitoring & Logging
Log Levels

Info: Audit scans started/completed, remediation actions

Warning: Excessive Admin roles, group overlaps detected

Error: Jira API failures, LLM call issues, report generation errors

Key Metrics

Number of elevated roles reduced

Dormant Admins identified

Policy violations flagged vs. resolved

Audit report generation times

External AI service performance

🚨 Troubleshooting
Common Issues

Permission Errors: Ensure the app has manage:jira-configuration and read:jira-user

Audit Not Running: Check if scheduled tasks are enabled in Forge triggers

LLM Response Failures: Verify external AI API credentials and quotas

Slow Scans: Large instances with 10k+ users may require batching

Debug Mode
# Enable verbose Forge logging
export FORGE_DEBUG=true

# Check app deployment status
forge status

# Stream logs for debugging
forge logs


🤝 Contributing

We welcome contributions to the AI Permission Auditor!

Fork this repository

Create a feature branch (git checkout -b feature/your-feature)

Make your changes with proper tests and logging

Submit a pull request with a clear description of your changes and their purpose

Code Standards

Follow the existing Forge app code style and structure

Ensure comprehensive logging for all new processors and services

Handle Jira API and LLM external calls with proper error handling/retries

Update inline documentation and README for API or feature changes

📄 License

This project is licensed under the MIT License – see the LICENSE
 file for details.

🆘 Support

Documentation: Forge Developer Portal

Issues: Report bugs, feature requests, or audit mismatches via GitHub Issues

Community: Join the Atlassian Community
 for discussions

Forge Help: Get Help with Forge

Security Feedback: For permission-related concerns, open a private issue or contact the maintainers directly