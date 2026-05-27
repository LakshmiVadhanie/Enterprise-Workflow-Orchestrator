#!/usr/bin/env python3
import urllib.request
import json
import time
import random
import sys

BASE_URL = "http://localhost:8082/api/workflows"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error {method} {url}: {e}", file=sys.stderr)
        return None

def get_workflows():
    res = make_request(f"{BASE_URL}?size=100")
    if res and "content" in res:
        return res["content"]
    return []

def start_workflow(wf_id):
    print(f"-> Starting workflow: {wf_id}")
    return make_request(f"{BASE_URL}/{wf_id}/start", method="POST")

def approve_step(wf_id, step_id, name):
    print(f"-> Approving/Completing step '{name}' for workflow: {wf_id}")
    payload = {"comment": f"Completed automatically by simulation engine"}
    return make_request(f"{BASE_URL}/{wf_id}/steps/{step_id}/approve", method="POST", data=payload)

def run_simulation(loop_forever=True):
    print("Starting Workflow Simulation Engine...")
    print(f"Targeting: {BASE_URL}")
    
    while True:
        workflows = get_workflows()
        if not workflows:
            print("No workflows found. Please seed the database first.")
            if not loop_forever:
                break
            time.sleep(5)
            continue
            
        active_found = False
        
        # 1. Look for PENDING workflows to start
        for wf in workflows:
            if wf.get("status") == "PENDING":
                start_workflow(wf["id"])
                active_found = True
                time.sleep(2)  # Pause to see real-time updates
                break # Just start one at a time for visual flow
                
        if active_found:
            continue
            
        # 2. Look for RUNNING or WAITING_APPROVAL workflows to advance
        for wf in workflows:
            status = wf.get("status")
            if status in ["RUNNING", "WAITING_APPROVAL"]:
                # Find the running step
                steps = wf.get("steps", [])
                # Sort steps by stepOrder
                steps = sorted(steps, key=lambda x: x.get("stepOrder", 0))
                
                for step in steps:
                    if step.get("status") == "RUNNING":
                        approve_step(wf["id"], step["id"], step["name"])
                        active_found = True
                        time.sleep(3) # Pause before next action
                        break
            if active_found:
                break
                
        if not active_found:
            print("All workflows completed or no active workflows to process. Waiting...")
            if not loop_forever:
                break
            time.sleep(5)

if __name__ == "__main__":
    loop = "--once" not in sys.argv
    run_simulation(loop_forever=loop)
