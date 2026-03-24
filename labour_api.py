"""
AgriShield Labour Finder API
Flask backend for job postings and applications management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
from typing import List, Dict, Any

app = Flask(__name__)
CORS(app)

# Data storage paths
DATA_DIR = "labour_data"
JOBS_FILE = os.path.join(DATA_DIR, "jobs.json")
APPLICATIONS_FILE = os.path.join(DATA_DIR, "applications.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)


def load_jobs() -> List[Dict[str, Any]]:
    """Load all job postings from storage"""
    if os.path.exists(JOBS_FILE):
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_jobs(jobs: List[Dict[str, Any]]) -> None:
    """Save job postings to storage"""
    with open(JOBS_FILE, "w", encoding="utf-8") as f:
        json.dump(jobs, f, indent=2, ensure_ascii=False)


def load_applications() -> List[Dict[str, Any]]:
    """Load all job applications from storage"""
    if os.path.exists(APPLICATIONS_FILE):
        with open(APPLICATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_applications(applications: List[Dict[str, Any]]) -> None:
    """Save job applications to storage"""
    with open(APPLICATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(applications, f, indent=2, ensure_ascii=False)


@app.route("/api/jobs", methods=["POST"])
def create_job():
    """Create a new job posting"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = [
            "jobTitle",
            "workType",
            "jobDate",
            "jobLocation",
            "dailyWage",
        ]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Create job object
        job = {
            "id": f"job-{int(datetime.now().timestamp() * 1000)}",
            "jobTitle": data.get("jobTitle", "").strip(),
            "jobDescription": data.get("jobDescription", "").strip(),
            "workType": data.get("workType", "").strip(),
            "workersNeeded": int(data.get("workersNeeded", 1)),
            "jobDate": data.get("jobDate"),
            "jobTime": data.get("jobTime", ""),
            "jobLocation": data.get("jobLocation", "").strip(),
            "dailyWage": int(data.get("dailyWage", 0)),
            "skillsRequired": data.get("skillsRequired", "").strip(),
            "contactMobile": data.get("contactMobile", "").strip(),
            "posterName": data.get("posterName", "Farmer").strip(),
            "createdAt": datetime.now().isoformat(),
            "applicants": []
        }

        # Save to file
        jobs = load_jobs()
        jobs.append(job)
        save_jobs(jobs)

        return jsonify({"success": True, "job": job}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    """Get all job postings or filter by criteria"""
    try:
        jobs = load_jobs()

        # Get filter parameters
        work_type = request.args.get("workType", "").strip()
        location = request.args.get("location", "").strip()
        min_wage = request.args.get("minWage", 0)
        max_wage = request.args.get("maxWage", 999999)

        # Apply filters
        filtered_jobs = []
        for job in jobs:
            if work_type and job["workType"] != work_type:
                continue
            if location and location.lower() not in job["jobLocation"].lower():
                continue
            if not (int(min_wage) <= job["dailyWage"] <= int(max_wage)):
                continue
            filtered_jobs.append(job)

        # Sort by date (newest first)
        filtered_jobs.sort(
            key=lambda x: x["createdAt"], reverse=True
        )

        return jsonify({"success": True, "jobs": filtered_jobs}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job(job_id: str):
    """Get a specific job posting"""
    try:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)

        if not job:
            return jsonify({"error": "Job not found"}), 404

        return jsonify({"success": True, "job": job}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications", methods=["POST"])
def create_application():
    """Submit a job application"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ["jobId", "applicantName", "applicantMobile"]
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Create application object
        application = {
            "id": f"app-{int(datetime.now().timestamp() * 1000)}",
            "jobId": data.get("jobId"),
            "applicantName": data.get("applicantName", "").strip(),
            "applicantMobile": data.get("applicantMobile", "").strip(),
            "experience": int(data.get("experience", 0)),
            "skills": data.get("skills", "").strip(),
            "coverLetter": data.get("coverLetter", "").strip(),
            "isAvailable": data.get("isAvailable", True),
            "appliedAt": datetime.now().isoformat(),
            "status": "pending"
        }

        # Save application
        applications = load_applications()
        applications.append(application)
        save_applications(applications)

        # Add applicant to job
        jobs = load_jobs()
        for job in jobs:
            if job["id"] == data.get("jobId"):
                if "applicants" not in job:
                    job["applicants"] = []
                job["applicants"].append(application)
                save_jobs(jobs)
                break

        return jsonify({"success": True, "application": application}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications", methods=["GET"])
def get_applications():
    """Get all applications with optional filtering"""
    try:
        applications = load_applications()

        # Get filter parameters
        job_id = request.args.get("jobId", "").strip()
        status = request.args.get("status", "").strip()

        # Apply filters
        filtered_apps = []
        for app in applications:
            if job_id and app["jobId"] != job_id:
                continue
            if status and app.get("status", "pending") != status:
                continue
            filtered_apps.append(app)

        # Sort by date (newest first)
        filtered_apps.sort(
            key=lambda x: x["appliedAt"], reverse=True
        )

        return jsonify({"success": True, "applications": filtered_apps}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<app_id>", methods=["GET"])
def get_application(app_id: str):
    """Get a specific application"""
    try:
        applications = load_applications()
        app = next((a for a in applications if a["id"] == app_id), None)

        if not app:
            return jsonify({"error": "Application not found"}), 404

        return jsonify({"success": True, "application": app}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/applications/<app_id>", methods=["PUT"])
def update_application(app_id: str):
    """Update an application status"""
    try:
        data = request.get_json()
        applications = load_applications()

        for app in applications:
            if app["id"] == app_id:
                if "status" in data:
                    app["status"] = data["status"]
                if "notes" in data:
                    app["notes"] = data["notes"]
                save_applications(applications)
                return jsonify({"success": True, "application": app}), 200

        return jsonify({"error": "Application not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/jobs/<job_id>", methods=["DELETE"])
def delete_job(job_id: str):
    """Delete a job posting"""
    try:
        jobs = load_jobs()
        jobs = [j for j in jobs if j["id"] != job_id]
        save_jobs(jobs)

        return jsonify({"success": True, "message": "Job deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Get platform statistics"""
    try:
        jobs = load_jobs()
        applications = load_applications()

        stats = {
            "totalJobs": len(jobs),
            "totalApplications": len(applications),
            "workTypeDistribution": {},
            "averageWage": 0
        }

        # Calculate work type distribution and average wage
        if jobs:
            total_wage = 0
            for job in jobs:
                work_type = job.get("workType", "Other")
                stats["workTypeDistribution"][work_type] = stats["workTypeDistribution"].get(work_type, 0) + 1
                total_wage += job.get("dailyWage", 0)

            stats["averageWage"] = round(total_wage / len(jobs), 2)

        return jsonify({"success": True, "stats": stats}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"success": True, "message": "API is running"}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
