#!/usr/bin/env python3
import urllib.request
import json
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8082/api/workflows"

def post_workflow(payload):
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(BASE_URL, data=req_data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            print(f"Created: {res['name']} ({res['id']}) with {len(res['steps'])} steps")
            return res
    except Exception as e:
        print(f"Error creating workflow {payload['name']}: {e}", file=sys.stderr)
        return None

def main():
    print("Seeding workflows with steps...")
    
    workflows = [
        {
            "name": "Prod Deploy v3.2",
            "description": "Production release for billing and user service updates.",
            "type": "DEPLOYMENT",
            "ownerId": "devops-1",
            "ownerEmail": "devops@acme.com",
            "priority": "CRITICAL",
            "steps": [
                {"stepOrder": 1, "name": "Build Docker Images", "description": "Compile codebase and build Docker images.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 600},
                {"stepOrder": 2, "name": "Security Scan", "description": "Vulnerability scanning of container images.", "type": "AUTOMATED_TASK", "maxRetries": 2, "timeoutSeconds": 300},
                {"stepOrder": 3, "name": "Approve Release", "description": "Manual sign-off from VP of Engineering.", "type": "HUMAN_APPROVAL", "assigneeId": "vp-eng", "assigneeEmail": "vp@acme.com", "maxRetries": 1, "timeoutSeconds": 86400},
                {"stepOrder": 4, "name": "Deploy to K8s", "description": "Rolling update deploy to production cluster.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 900},
                {"stepOrder": 5, "name": "Verify & Healthcheck", "description": "Automated verification of service endpoints.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 300}
            ]
        },
        {
            "name": "Q4 Budget Approval",
            "description": "Financial planning review and corporate budget sign-off.",
            "type": "APPROVAL",
            "ownerId": "finance-mgr",
            "ownerEmail": "finance.manager@acme.com",
            "priority": "HIGH",
            "steps": [
                {"stepOrder": 1, "name": "Compile Departmental Budgets", "description": "Aggregate spreadsheet data from all teams.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 1800},
                {"stepOrder": 2, "name": "Finance Committee Review", "description": "Review and approve the aggregated budget proposal.", "type": "HUMAN_APPROVAL", "assigneeId": "cfo", "assigneeEmail": "cfo@acme.com", "maxRetries": 1, "timeoutSeconds": 172800},
                {"stepOrder": 3, "name": "CEO Final Sign-off", "description": "Final approval on executive budget.", "type": "HUMAN_APPROVAL", "assigneeId": "ceo", "assigneeEmail": "ceo@acme.com", "maxRetries": 1, "timeoutSeconds": 172800}
            ]
        },
        {
            "name": "ETL CRM Sync",
            "description": "Nightly synchronization between Salesforce and internal warehouse.",
            "type": "DATA_PIPELINE",
            "ownerId": "data-eng",
            "ownerEmail": "data@acme.com",
            "priority": "MEDIUM",
            "steps": [
                {"stepOrder": 1, "name": "Extract Salesforce Contacts", "description": "Pull latest contact updates via Salesforce API.", "type": "AUTOMATED_TASK", "maxRetries": 5, "timeoutSeconds": 1200},
                {"stepOrder": 2, "name": "Transform & Cleanse", "description": "Format and validate data schemas.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 600},
                {"stepOrder": 3, "name": "Load to Redshift", "description": "Bulk insert records into warehouse.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 1800}
            ]
        },
        {
            "name": "New Hire: Sarah Chen",
            "description": "Onboarding pipeline for new Principal Software Engineer.",
            "type": "ONBOARDING",
            "ownerId": "hr-partner",
            "ownerEmail": "hr@acme.com",
            "priority": "MEDIUM",
            "steps": [
                {"stepOrder": 1, "name": "HR Document Verification", "description": "Verify background check and sign contracts.", "type": "HUMAN_APPROVAL", "assigneeId": "hr-rep", "assigneeEmail": "hr.rep@acme.com", "maxRetries": 1, "timeoutSeconds": 259200},
                {"stepOrder": 2, "name": "Provision LDAP & GitHub Accounts", "description": "Automated account creation in LDAP and GitHub organizations.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 300},
                {"stepOrder": 3, "name": "Order Hardware", "description": "Manager approves laptop specification.", "type": "HUMAN_APPROVAL", "assigneeId": "dev-mgr", "assigneeEmail": "manager@acme.com", "maxRetries": 1, "timeoutSeconds": 86400},
                {"stepOrder": 4, "name": "Welcome Email", "description": "Send credentials and welcome details.", "type": "AUTOMATED_TASK", "maxRetries": 1, "timeoutSeconds": 300}
            ]
        },
        {
            "name": "SOC2 Audit 2026",
            "description": "Annual security compliance review and control evidence gathering.",
            "type": "COMPLIANCE",
            "ownerId": "sec-officer",
            "ownerEmail": "security@acme.com",
            "priority": "CRITICAL",
            "steps": [
                {"stepOrder": 1, "name": "Generate Access Logs", "description": "Extract access logs for production systems.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 1200},
                {"stepOrder": 2, "name": "Verify Encryption Settings", "description": "Audit S3 bucket and DB encryption configurations.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 600},
                {"stepOrder": 3, "name": "Security Officer Approval", "description": "Review and sign off on collected evidence.", "type": "HUMAN_APPROVAL", "assigneeId": "sec-officer", "assigneeEmail": "security@acme.com", "maxRetries": 1, "timeoutSeconds": 604800}
            ]
        },
        {
            "name": "Salesforce Sync Service",
            "description": "Sync customer subscription data from Stripe to Salesforce.",
            "type": "INTEGRATION",
            "ownerId": "billing-eng",
            "ownerEmail": "billing@acme.com",
            "priority": "LOW",
            "steps": [
                {"stepOrder": 1, "name": "Fetch Stripe Invoices", "description": "Fetch invoice items paid within the last 24h.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 300},
                {"stepOrder": 2, "name": "Update Salesforce Accounts", "description": "Match email and update Account Tier.", "type": "AUTOMATED_TASK", "maxRetries": 3, "timeoutSeconds": 600}
            ]
        }
    ]

    for wf in workflows:
        post_workflow(wf)
        
    print("Successfully seeded workflows with steps.")

if __name__ == "__main__":
    main()
