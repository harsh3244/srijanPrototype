# AgriShield Labour Finder - Setup Guide

## LinkedIn-Style Labour Finder Features

This directory contains the AgriShield prototype with a new LinkedIn-style Labour Finder interface that includes:

1. **Hire a Worker** - Allow farmers to post job listings
2. **Browse Jobs** - Allow workers to search and apply for available jobs

## Project Structure

### Frontend
- **prototype/dashboard.html** - Main dashboard with Labour Finder section
- **prototype/js/script.js** - Frontend logic including job posting and application handling
- **prototype/css/style.css** - Styling for Labour Finder UI with LinkedIn-style design
- **prototype/** - Other existing pages (login, register, etc.)

### Backend
- **labour_api.py** - Flask REST API for job postings and applications management
- **requirements.txt** - Python dependencies

## Features

### For Farmers (Hiring)
- Post job listings with details like:
  - Job title and description
  - Work type (Harvesting, Sugarcane Cutting, Weeding, etc.)
  - Number of workers needed
  - Date and time required
  - Daily wage
  - Skills required (optional)
- View applications received
- Contact applicants

### For Workers (Job Seekers)
- Browse available jobs with filters:
  - Filter by work type
  - Filter by wage range
  - Search by location
- View job details:
  - Work description
  - Date, time, and location
  - Daily wage
  - Workers needed
- Apply for jobs with:
  - Personal information
  - Experience level
  - Skills and expertise
  - Cover letter

## Setup Instructions

### 1. Frontend Setup

The frontend is already integrated into the existing AgriShield dashboard. No additional setup is needed for the HTML/CSS/JavaScript.

**Key files modified:**
- Added Labour Finder options section with "Hire a Worker" and "Browse Jobs" buttons
- Added modals for job posting and application forms
- Added CSS for LinkedIn-style cards and animations
- Added JavaScript for modal management and form handling

### 2. Backend Setup

#### Prerequisites
- Python 3.7+
- pip (Python package manager)

#### Installation Steps

1. **Navigate to project directory:**
   ```bash
   cd c:\Users\user\Documents\GitHub\srijanPrototype
   ```

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Flask server:**
   ```bash
   python labour_api.py
   ```

   The API will start at `http://localhost:5000`

## API Endpoints

### Jobs
- **POST /api/jobs** - Create a new job posting
- **GET /api/jobs** - Get all jobs (with optional filters)
- **GET /api/jobs/<job_id>** - Get a specific job
- **DELETE /api/jobs/<job_id>** - Delete a job posting

### Applications
- **POST /api/applications** - Submit a job application
- **GET /api/applications** - Get all applications (with optional filters)
- **GET /api/applications/<app_id>** - Get a specific application
- **PUT /api/applications/<app_id>** - Update application status

### Utility
- **GET /api/stats** - Get platform statistics
- **GET /api/health** - Health check

## Data Storage

The backend stores data in JSON files:
- `labour_data/jobs.json` - Job postings
- `labour_data/applications.json` - Job applications

These files are automatically created when the first job or application is submitted.

## Frontend Integration

The frontend currently uses browser localStorage for data persistence. To integrate with the backend API, update the `labour_api.py` imports and function calls in `prototype/js/script.js`:

**Example - Posting a job via API:**
```javascript
// Instead of storing locally:
// state.jobPostings.unshift(jobPosting);
// setUserStoredValue(USER_STORAGE_KEYS.jobPostings, state.jobPostings);

// Make API call:
fetch('http://localhost:5000/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobPosting)
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        showToast('Job posted successfully!');
        state.jobPostings.unshift(data.job);
    }
});
```

## Usage Example

### Posting a Job (Farmer)
1. Navigate to Labour Finding section
2. Click "Post a Job" button
3. Fill in job details:
   - Job Title: "Harvesting Workers Needed"
   - Work Type: "Harvesting"
   - Workers Needed: 5
   - Date & Time: Select required date/time
   - Location: Farm address
   - Daily Wage: 500
4. Click "Post Job"
5. Job appears in the job listings

### Applying for a Job (Worker)
1. Navigate to Labour Finding section
2. Click "Browse Jobs" button
3. Search and filter jobs by:
   - Work type
   - Wage range
   - Location search
4. Click "Apply Now" on desired job
5. Fill in application details:
   - Name and mobile number
   - Experience level
   - Skills
   - Cover letter
6. Check availability checkbox
7. Click "Submit Application"

## Styling & Design

The Labour Finder uses the existing AgriShield design system with:
- **Consistent color palette**: Green (#2aad5f) and teal (#49c4a8) accents
- **Rounded cards**: Border-radius of 1.05rem to 1.5rem
- **Smooth animations**: 180ms ease transitions
- **LinkedIn-style layout**: Card-based, two-column grid on desktop
- **Responsive design**: Adapts to mobile, tablet, and desktop

### New CSS Classes
- `.labour-options-grid` - Main grid for hire/apply options
- `.labour-option-card` - Individual option cards
- `.modal` - Modal dialog base styles
- `.job-card` - Job listing card
- `.job-listings` - Job listings container

## Demo Data

The system includes 3 mock job postings by default for demonstration:
1. Harvesting Workers - 5 spots, Rs. 500/day
2. Sugarcane Cutters - 8 spots, Rs. 600/day
3. Weeding Service - 3 spots, Rs. 350/day

These are automatically loaded when the "Browse Jobs" modal is opened for the first time.

## Future Enhancements

Potential improvements:
1. **Database Integration**: Replace JSON files with PostgreSQL/MySQL
2. **Authentication**: Add user authentication for farmers and workers
3. **Real-time Notifications**: Add WebSocket support for instant notifications
4. **Rating System**: Allow workers and farmers to rate each other
5. **Payment Integration**: Integrate payment gateway for wage transfers
6. **AI Matching**: Use ML to match jobs with suitable workers
7. **Location-based Services**: GPS integration for finding nearby jobs
8. **Mobile App**: React Native or Flutter mobile application

## Support

For issues or questions, refer to the main AgriShield documentation or contact the development team.

## License

Part of AgriShield Hackathon Prototype - All rights reserved
