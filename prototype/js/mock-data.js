window.AgriMockData = {
    labourers: [
        {
            id: "labour-1",
            name: "Shivneri Harvest Group",
            type: "Group",
            workType: "Harvesting",
            skills: ["Wheat harvesting", "Onion picking", "Sorting"],
            availableCount: 12,
            location: "Baramati, Maharashtra",
            availability: "Available today",
            contact: "+91 98765 42001",
            details: "Experienced group for fast harvest work with field supervisor and transport support."
        },
        {
            id: "labour-2",
            name: "Ramesh Farm Helper",
            type: "Individual",
            workType: "Spraying",
            skills: ["Pesticide spraying", "Pump handling", "Field support"],
            availableCount: 1,
            location: "Nashik, Maharashtra",
            availability: "Limited availability",
            contact: "+91 98765 42002",
            details: "Useful for spraying rounds, orchard support, and short-duration daily work."
        },
        {
            id: "labour-3",
            name: "Green Field Women Group",
            type: "Group",
            workType: "Weeding",
            skills: ["Weeding", "Bed cleaning", "Vegetable patch care"],
            availableCount: 8,
            location: "Pune, Maharashtra",
            availability: "Available today",
            contact: "+91 98765 42003",
            details: "Reliable group for vegetable farms, row crops, and early-stage field cleanup."
        },
        {
            id: "labour-4",
            name: "Cane Cutters Seva Team",
            type: "Group",
            workType: "Sugarcane Cutting",
            skills: ["Sugarcane cutting", "Bundling", "Loading"],
            availableCount: 18,
            location: "Kolhapur, Maharashtra",
            availability: "Available this week",
            contact: "+91 98765 42004",
            details: "Specialized team for sugarcane harvest with high daily output and loading support."
        },
        {
            id: "labour-5",
            name: "Maa Shakti Transplant Team",
            type: "Group",
            workType: "Transplanting",
            skills: ["Paddy transplanting", "Vegetable planting", "Nursery shifting"],
            availableCount: 10,
            location: "Belagavi, Karnataka",
            availability: "Available this week",
            contact: "+91 98765 42005",
            details: "Good fit for paddy work, chilli planting, and seasonal transplant demand."
        },
        {
            id: "labour-6",
            name: "Kisan Loading Crew",
            type: "Group",
            workType: "Loading",
            skills: ["Loading", "Bagging", "Market dispatch"],
            availableCount: 6,
            location: "Indore, Madhya Pradesh",
            availability: "Available today",
            contact: "+91 98765 42006",
            details: "Useful for mandi dispatch, warehouse movement, and bag loading after harvest."
        },
        {
            id: "labour-7",
            name: "Satara Field Support Team",
            type: "Group",
            workType: "Harvesting",
            skills: ["Harvesting", "Sorting", "Crate handling"],
            availableCount: 9,
            location: "Satara, Maharashtra",
            availability: "Available this week",
            contact: "+91 98765 42007",
            details: "Good fit for vegetable harvest, fruit collection, and short peak-season labour support."
        },
        {
            id: "labour-8",
            name: "Anita Rural Work Group",
            type: "Group",
            workType: "Weeding",
            skills: ["Weeding", "Manual interculture", "Field cleanup"],
            availableCount: 7,
            location: "Ahmednagar, Maharashtra",
            availability: "Available today",
            contact: "+91 98765 42008",
            details: "Useful for row crops and fast field cleaning when family labour is short."
        }
    ],
    schemes: [
        {
            id: "scheme-1",
            name: "PM-KISAN Income Support",
            categories: ["small-farmer", "crop-support"],
            description: "Direct income support for eligible landholding farmer families.",
            eligibility: "Small and marginal farmers with valid land records.",
            benefits: "INR 6,000 per year in installments.",
            documents: ["Aadhaar", "Bank passbook", "Land record"],
            cta: "Learn More",
            landMax: 2.5,
            cropTags: []
        },
        {
            id: "scheme-2",
            name: "Pradhan Mantri Fasal Bima Yojana",
            categories: ["insurance", "crop-support"],
            description: "Crop insurance support against yield loss, weather damage, and seasonal risk.",
            eligibility: "Farmers growing notified crops in notified areas.",
            benefits: "Premium support and financial protection against crop loss.",
            documents: ["Aadhaar", "Bank account", "Sowing proof"],
            cta: "Apply",
            cropTags: ["rice", "wheat", "cotton", "maize", "soybean", "tomato", "onion", "sugarcane"]
        },
        {
            id: "scheme-3",
            name: "Sub-Mission on Agricultural Mechanization",
            categories: ["labour-support", "equipment-subsidy"],
            description: "Subsidy support for farm machines that reduce labour burden during peak work.",
            eligibility: "Farmers or groups purchasing approved farm equipment.",
            benefits: "Support on machines and tools that reduce dependency on manual labour.",
            documents: ["Aadhaar", "Quotation", "Bank details", "Land proof"],
            cta: "Apply",
            landMin: 1
        },
        {
            id: "scheme-4",
            name: "Custom Hiring Centre Support",
            categories: ["labour-support", "equipment-subsidy"],
            description: "Encourages access to rented machines and service centers when labour is short.",
            eligibility: "Farmer groups, cooperatives, or farms facing labour shortage at scale.",
            benefits: "Access to farm machinery services without full equipment ownership.",
            documents: ["Farmer registration", "Bank details", "Land proof"],
            cta: "Learn More",
            farmingTypeTags: ["seasonal hiring", "commercial farming"]
        },
        {
            id: "scheme-5",
            name: "Kisan Credit Card Working Capital",
            categories: ["small-farmer", "labour-support"],
            description: "Short-term credit support for seasonal farm expenses including wages and inputs.",
            eligibility: "Farmers needing timely working capital for field operations.",
            benefits: "Flexible credit support for labour payments and input purchase.",
            documents: ["Aadhaar", "Bank account", "Land details"],
            cta: "Apply",
            landMax: 5
        },
        {
            id: "scheme-6",
            name: "State Horticulture Crop Assistance",
            categories: ["crop-support", "small-farmer"],
            description: "Support for high-value crop growers such as vegetables and horticulture farms.",
            eligibility: "Farmers growing vegetables, fruit crops, or intensive horticulture crops.",
            benefits: "Input support and crop development assistance for horticulture-based farming.",
            documents: ["Aadhaar", "Crop details", "Land proof", "Bank details"],
            cta: "Learn More",
            cropTags: ["tomato", "onion"],
            farmingTypeTags: ["horticulture"]
        },
        {
            id: "scheme-7",
            name: "Farmer Producer Group Labour Support",
            categories: ["labour-support", "small-farmer"],
            description: "Support for small farmers joining a group model to reduce peak-season labour pressure.",
            eligibility: "Small farmers or farmer groups facing labour shortage during sowing, weeding, or harvest.",
            benefits: "Shared hiring support, labour pooling, and access to coordinated seasonal workforce planning.",
            documents: ["Aadhaar", "Farmer registration", "Land proof", "Group details"],
            cta: "Learn More",
            landMax: 4
        }
    ]
};
