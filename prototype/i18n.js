/**
 * AgriShield i18n Engine v2.0
 * data-i18n="key"       → textContent
 * data-i18n-ph="key"    → placeholder
 * data-i18n-title="key" → title attribute
 * data-i18n-aria="key"  → aria-label
 * window.AgriI18n.apply(lang)  to switch
 * Persists to localStorage key "agrishield_lang"
 */
(function(global){
"use strict";
var T={
"brand.name":{en:"AgriShield",hi:"एग्रीशील्ड",mr:"अ‍ॅग्रीशील्ड"},
"brand.sub.dashboard":{en:"Farmer support dashboard",hi:"किसान सहायता डैशबोर्ड",mr:"शेतकरी सहाय्य डॅशबोर्ड"},
"brand.sub.labour":{en:"Labour support assistant",hi:"श्रम सहायता सहायक",mr:"मजूर सहाय्य सहायक"},
"nav.home":{en:"Home",hi:"होम",mr:"मुख्यपृष्ठ"},
"nav.labour":{en:"Labour Finding",hi:"मजदूर खोज",mr:"मजूर शोध"},
"nav.schemes":{en:"Government Schemes",hi:"सरकारी योजनाएं",mr:"सरकारी योजना"},
"nav.guide":{en:"App Guide",hi:"ऐप गाइड",mr:"अ‍ॅप मार्गदर्शिका"},
"sidebar.coreflow.label":{en:"Core Flow",hi:"मुख्य प्रवाह",mr:"मुख्य प्रवाह"},
"sidebar.coreflow.strong":{en:"Save farmer details, then solve labour access.",hi:"किसान विवरण सहेजें, फिर मजदूर पहुंच हल करें।",mr:"शेतकरी माहिती सेव्ह करा, नंतर मजुराचा प्रश्न सोडवा."},
"sidebar.coreflow.p":{en:"The dashboard begins with profile setup, then moves into labour discovery, tutorial guidance, and matched scheme support.",hi:"डैशबोर्ड प्रोफाइल सेटअप से शुरू होता है, फिर मजदूर खोज, ट्यूटोरियल और योजना समर्थन में जाता है।",mr:"डॅशबोर्ड प्रोफाइल सेटअपने सुरू होतो, मग मजूर शोध, मार्गदर्शन आणि योजना समर्थनाकडे जातो."},
"sidebar.demo.label":{en:"Demo Story",hi:"डेमो कहानी",mr:"डेमो कथा"},
"sidebar.demo.li1":{en:"Save the farmer profile",hi:"किसान प्रोफाइल सहेजें",mr:"शेतकरी प्रोफाइल सेव्ह करा"},
"sidebar.demo.li2":{en:"Find or post labour needs",hi:"मजदूर जरूरत खोजें या पोस्ट करें",mr:"मजूर गरज शोधा किंवा पोस्ट करा"},
"sidebar.demo.li3":{en:"Review scheme recommendations",hi:"योजना सुझाव देखें",mr:"योजना शिफारशी पहा"},
"topbar.platform":{en:"Farmer Labour Support Platform",hi:"किसान मजदूर सहायता प्लेटफॉर्म",mr:"शेतकरी मजूर सहाय्य व्यासपीठ"},
"topbar.lang.label":{en:"Language",hi:"भाषा",mr:"भाषा"},
"topbar.logout":{en:"Logout",hi:"लॉगआउट",mr:"बाहेर पडा"},
"topbar.guide":{en:"Guide",hi:"गाइड",mr:"मार्गदर्शिका"},
"topbar.meta":{en:"Prototype login",hi:"प्रोटोटाइप लॉगिन",mr:"प्रोटोटाइप लॉगिन"},
"topbar.notif":{en:"Notifications",hi:"सूचनाएं",mr:"सूचना"},
"page.title.home":{en:"Home",hi:"होम",mr:"मुख्यपृष्ठ"},
"page.sub.home":{en:"Save farmer details and unlock labour and scheme recommendations.",hi:"किसान विवरण सहेजें और मजदूर और योजना सिफारिशें अनलॉक करें।",mr:"शेतकरी माहिती सेव्ह करा आणि मजूर व योजना शिफारशी उघडा."},
"page.title.labour":{en:"Labour Finding",hi:"मजदूर खोज",mr:"मजूर शोध"},
"page.sub.labour":{en:"Find workers, post jobs, and connect with available labour.",hi:"मजदूर खोजें, नौकरी पोस्ट करें और उपलब्ध श्रमिकों से जुड़ें।",mr:"मजूर शोधा, काम पोस्ट करा आणि उपलब्ध मजुरांशी जोडा."},
"page.title.schemes":{en:"Government Schemes",hi:"सरकारी योजनाएं",mr:"सरकारी योजना"},
"page.sub.schemes":{en:"Explore schemes matched to your farm profile.",hi:"अपनी खेत प्रोफाइल से मेल खाने वाली योजनाएं देखें।",mr:"तुमच्या शेत प्रोफाइलशी जुळणाऱ्या योजना पहा."},
"home.eyebrow":{en:"Farmer Home",hi:"किसान होम",mr:"शेतकरी मुख्यपृष्ठ"},
"home.welcome":{en:"Welcome to your smart farming support dashboard.",hi:"आपके स्मार्ट कृषि सहायता डैशबोर्ड में आपका स्वागत है।",mr:"तुमच्या स्मार्ट शेती सहाय्य डॅशबोर्डमध्ये स्वागत आहे."},
"home.desc":{en:"Save farmer details first, choose the farm location using search or the map, and then use the dashboard for labour support, guided tutorial help, and scheme discovery.",hi:"पहले किसान विवरण सहेजें, खोज या मानचित्र से खेत का स्थान चुनें, फिर मजदूर समर्थन, ट्यूटोरियल और योजना खोज के लिए डैशबोर्ड का उपयोग करें।",mr:"आधी शेतकरी माहिती सेव्ह करा, शोध किंवा नकाशाने शेताचे ठिकाण निवडा, मग मजूर सहाय्य, मार्गदर्शन आणि योजना शोधासाठी डॅशबोर्ड वापरा."},
"home.btn.labour":{en:"Explore Labour",hi:"मजदूर देखें",mr:"मजूर पाहा"},
"home.btn.schemes":{en:"View Schemes",hi:"योजनाएं देखें",mr:"योजना पहा"},
"metric.farmername":{en:"Farmer Name",hi:"किसान का नाम",mr:"शेतकऱ्याचे नाव"},
"metric.maincrop":{en:"Main Crop",hi:"मुख्य फसल",mr:"मुख्य पीक"},
"metric.landarea":{en:"Land Area",hi:"भूमि क्षेत्र",mr:"जमीन क्षेत्र"},
"metric.schemes":{en:"Suggested Schemes",hi:"सुझावित योजनाएं",mr:"सुचवलेल्या योजना"},
"metric.notsaved":{en:"Not saved yet",hi:"अभी सहेजा नहीं",mr:"अद्याप सेव्ह नाही"},
"metric.profileneeded":{en:"Profile needed",hi:"प्रोफाइल जरूरी",mr:"प्रोफाइल आवश्यक"},
"metric.zeromatches":{en:"0 matches",hi:"0 मिलान",mr:"0 जुळणी"},
"form.profile.kicker":{en:"Farmer Profile",hi:"किसान प्रोफाइल",mr:"शेतकरी प्रोफाइल"},
"form.profile.title":{en:"Farmer Details Form",hi:"किसान विवरण फॉर्म",mr:"शेतकरी तपशील फॉर्म"},
"form.profile.desc":{en:"All data is stored in localStorage for this hackathon prototype.",hi:"सभी डेटा इस हैकाथॉन प्रोटोटाइप के लिए localStorage में संग्रहीत है।",mr:"सर्व डेटा या हॅकाथॉन प्रोटोटाइपसाठी localStorage मध्ये साठवला आहे."},
"field.fullname":{en:"Full Name",hi:"पूरा नाम",mr:"पूर्ण नाव"},
"field.mobile":{en:"Mobile Number",hi:"मोबाइल नंबर",mr:"मोबाइल नंबर"},
"field.village":{en:"Village",hi:"गांव",mr:"गाव"},
"field.taluka":{en:"Taluka / Tehsil",hi:"तालुका / तहसील",mr:"तालुका / तहसील"},
"field.district":{en:"District",hi:"जिला",mr:"जिल्हा"},
"field.state":{en:"State",hi:"राज्य",mr:"राज्य"},
"field.address":{en:"Full Address",hi:"पूरा पता",mr:"पूर्ण पत्ता"},
"field.landarea":{en:"Land Area (acres)",hi:"भूमि क्षेत्र (एकड़)",mr:"जमीन क्षेत्र (एकर)"},
"field.maincrop":{en:"Main Crop",hi:"मुख्य फसल",mr:"मुख्य पीक"},
"field.farmingtype":{en:"Farming Type",hi:"खेती का प्रकार",mr:"शेतीचा प्रकार"},
"field.latitude":{en:"Latitude",hi:"अक्षांश",mr:"अक्षांश"},
"field.longitude":{en:"Longitude",hi:"देशांतर",mr:"रेखांश"},
"field.username":{en:"Username",hi:"उपयोगकर्ता नाम",mr:"वापरकर्तानाव"},
"field.password":{en:"Password",hi:"पासवर्ड",mr:"पासवर्ड"},
"field.confirmpass":{en:"Confirm Password",hi:"पासवर्ड की पुष्टि",mr:"पासवर्ड कन्फर्म करा"},
"field.captcha":{en:"CAPTCHA",hi:"CAPTCHA",mr:"CAPTCHA"},
"field.captcha.ans":{en:"CAPTCHA Answer",hi:"CAPTCHA उत्तर",mr:"CAPTCHA उत्तर"},
"field.worktype":{en:"Preferred Work Type",hi:"पसंदीदा काम का प्रकार",mr:"पसंतीचा कामाचा प्रकार"},
"field.experience":{en:"Experience (years)",hi:"अनुभव (वर्ष)",mr:"अनुभव (वर्षे)"},
"field.wage":{en:"Expected Daily Wage (Rs.)",hi:"अपेक्षित दैनिक वेतन (रु.)",mr:"अपेक्षित दैनिक मजुरी (रु.)"},
"field.skills":{en:"Skills",hi:"कौशल",mr:"कौशल्ये"},
"field.availability":{en:"Availability",hi:"उपलब्धता",mr:"उपलब्धता"},
"field.currentloc":{en:"Current Location",hi:"वर्तमान स्थान",mr:"सध्याचे स्थान"},
"ph.fullname":{en:"Enter full name",hi:"पूरा नाम दर्ज करें",mr:"पूर्ण नाव प्रविष्ट करा"},
"ph.mobile":{en:"10-digit mobile number",hi:"10 अंकों का मोबाइल नंबर",mr:"10 अंकी मोबाइल नंबर"},
"ph.village":{en:"Enter village",hi:"गांव दर्ज करें",mr:"गाव प्रविष्ट करा"},
"ph.taluka":{en:"Enter taluka or tehsil",hi:"तालुका या तहसील दर्ज करें",mr:"तालुका किंवा तहसील प्रविष्ट करा"},
"ph.district":{en:"Enter district",hi:"जिला दर्ज करें",mr:"जिल्हा प्रविष्ट करा"},
"ph.state":{en:"Enter state",hi:"राज्य दर्ज करें",mr:"राज्य प्रविष्ट करा"},
"ph.address":{en:"Search a place or select on the map",hi:"स्थान खोजें या नक्शे पर चुनें",mr:"स्थान शोधा किंवा नकाशावर निवडा"},
"ph.lat":{en:"Latitude will auto-fill",hi:"अक्षांश स्वतः भरेगा",mr:"अक्षांश आपोआप भरेल"},
"ph.lng":{en:"Longitude will auto-fill",hi:"देशांतर स्वतः भरेगा",mr:"रेखांश आपोआप भरेल"},
"ph.landarea":{en:"Example: 2.5",hi:"उदाहरण: 2.5",mr:"उदाहरण: 2.5"},
"ph.skills":{en:"Example: Harvesting, Spraying, Machine support",hi:"उदाहरण: कटाई, छिड़काव, मशीन सहायता",mr:"उदाहरण: कापणी, फवारणी, यंत्र सहाय्य"},
"ph.currentloc":{en:"Village / city / district",hi:"गांव / शहर / जिला",mr:"गाव / शहर / जिल्हा"},
"ph.wage":{en:"Example: 550",hi:"उदाहरण: 550",mr:"उदाहरण: 550"},
"ph.experience":{en:"Example: 3",hi:"उदाहरण: 3",mr:"उदाहरण: 3"},
"ph.mapsearch":{en:"Search village, farm area, taluka, or address",hi:"गांव, खेत क्षेत्र, तालुका या पता खोजें",mr:"गाव, शेत क्षेत्र, तालुका किंवा पत्ता शोधा"},
"ph.username":{en:"Enter your username",hi:"अपना उपयोगकर्ता नाम दर्ज करें",mr:"तुमचे वापरकर्तानाव प्रविष्ट करा"},
"ph.password":{en:"Enter your password",hi:"अपना पासवर्ड दर्ज करें",mr:"तुमचा पासवर्ड प्रविष्ट करा"},
"ph.captcha.ans":{en:"Enter the answer",hi:"उत्तर दर्ज करें",mr:"उत्तर प्रविष्ट करा"},
"ph.createuser":{en:"Create a username",hi:"एक उपयोगकर्ता नाम बनाएं",mr:"वापरकर्तानाव तयार करा"},
"ph.createpass":{en:"Create a password",hi:"पासवर्ड बनाएं",mr:"पासवर्ड तयार करा"},
"ph.confirmpass":{en:"Re-enter password",hi:"पासवर्ड पुनः दर्ज करें",mr:"पासवर्ड पुन्हा प्रविष्ट करा"},
"ph.jobtitle":{en:"e.g., Harvesting Workers, Sugarcane Cutters",hi:"जैसे: कटाई मजदूर, गन्ना काटने वाले",mr:"उदा: कापणी कामगार, ऊस तोडणी"},
"ph.jobdesc":{en:"Describe the job details, responsibilities, and requirements",hi:"नौकरी विवरण, जिम्मेदारियां और आवश्यकताएं बताएं",mr:"कामाचे तपशील, जबाबदाऱ्या आणि आवश्यकता सांगा"},
"ph.joblocation":{en:"Farm location / address",hi:"खेत का स्थान / पता",mr:"शेताचे ठिकाण / पत्ता"},
"ph.workers.num":{en:"Example: 5",hi:"उदाहरण: 5",mr:"उदाहरण: 5"},
"ph.wage.num":{en:"Example: 500",hi:"उदाहरण: 500",mr:"उदाहरण: 500"},
"ph.skills.req":{en:"e.g., Machine operation, Weeding experience",hi:"जैसे: मशीन संचालन, निराई अनुभव",mr:"उदा: यंत्र चालवणे, खुरपणी अनुभव"},
"ph.contact.mob":{en:"Your contact number",hi:"आपका संपर्क नंबर",mr:"तुमचा संपर्क नंबर"},
"ph.appname":{en:"Enter your full name",hi:"अपना पूरा नाम दर्ज करें",mr:"तुमचे पूर्ण नाव प्रविष्ट करा"},
"ph.appmobile":{en:"Your contact number",hi:"आपका संपर्क नंबर",mr:"तुमचा संपर्क नंबर"},
"ph.appexp":{en:"Example: 3",hi:"उदाहरण: 3",mr:"उदाहरण: 3"},
"ph.appskills":{en:"List your skills and expertise",hi:"अपने कौशल और विशेषज्ञता सूचीबद्ध करें",mr:"तुमची कौशल्ये आणि तज्ज्ञता सांगा"},
"ph.coverletter":{en:"Tell the employer why you're a good fit",hi:"नियोक्ता को बताएं कि आप उपयुक्त क्यों हैं",mr:"नोकरीदाराला सांगा तुम्ही का योग्य आहात"},
"ph.jobsearch":{en:"Search jobs by title, location, or type...",hi:"शीर्षक, स्थान या प्रकार से नौकरियां खोजें...",mr:"शीर्षक, स्थान किंवा प्रकाराने काम शोधा..."},
"ph.hire.worktype":{en:"e.g., Harvesting",hi:"जैसे: कटाई",mr:"उदा: कापणी"},
"ph.hire.location":{en:"Village",hi:"गांव",mr:"गाव"},
"ph.hire.workers":{en:"5",hi:"5",mr:"5"},
"ph.hire.wage":{en:"500",hi:"500",mr:"500"},
"opt.select.crop":{en:"Select crop",hi:"फसल चुनें",mr:"पीक निवडा"},
"opt.crop.rice":{en:"Rice",hi:"चावल",mr:"तांदूळ"},
"opt.crop.wheat":{en:"Wheat",hi:"गेहूं",mr:"गहू"},
"opt.crop.sugarcane":{en:"Sugarcane",hi:"गन्ना",mr:"ऊस"},
"opt.crop.cotton":{en:"Cotton",hi:"कपास",mr:"कापूस"},
"opt.crop.tomato":{en:"Tomato",hi:"टमाटर",mr:"टोमॅटो"},
"opt.crop.onion":{en:"Onion",hi:"प्याज",mr:"कांदा"},
"opt.crop.maize":{en:"Maize",hi:"मक्का",mr:"मका"},
"opt.crop.soybean":{en:"Soybean",hi:"सोयाबीन",mr:"सोयाबीन"},
"opt.farmtype.select":{en:"Select farming type",hi:"खेती का प्रकार चुनें",mr:"शेतीचा प्रकार निवडा"},
"opt.farmtype.small":{en:"Small Farmer",hi:"छोटे किसान",mr:"लहान शेतकरी"},
"opt.farmtype.seasonal":{en:"Seasonal Hiring",hi:"मौसमी भर्ती",mr:"हंगामी भाड्याने"},
"opt.farmtype.family":{en:"Family Farming",hi:"पारिवारिक खेती",mr:"कौटुंबिक शेती"},
"opt.farmtype.commercial":{en:"Commercial Farming",hi:"व्यावसायिक खेती",mr:"व्यावसायिक शेती"},
"opt.farmtype.hort":{en:"Horticulture",hi:"बागवानी",mr:"फलोत्पादन"},
"opt.worktype.select":{en:"Select work type",hi:"काम का प्रकार चुनें",mr:"कामाचा प्रकार निवडा"},
"opt.worktype.harvesting":{en:"Harvesting",hi:"कटाई",mr:"कापणी"},
"opt.worktype.sugarcane":{en:"Sugarcane Cutting",hi:"गन्ना कटाई",mr:"ऊस तोडणी"},
"opt.worktype.weeding":{en:"Weeding",hi:"निराई",mr:"खुरपणी"},
"opt.worktype.transplanting":{en:"Transplanting",hi:"रोपाई",mr:"लागवड"},
"opt.worktype.spraying":{en:"Spraying",hi:"छिड़काव",mr:"फवारणी"},
"opt.worktype.loading":{en:"Loading",hi:"लोडिंग",mr:"लोडिंग"},
"opt.worktype.other":{en:"Other",hi:"अन्य",mr:"इतर"},
"opt.avail.select":{en:"Select availability",hi:"उपलब्धता चुनें",mr:"उपलब्धता निवडा"},
"opt.avail.today":{en:"Available today",hi:"आज उपलब्ध",mr:"आज उपलब्ध"},
"opt.avail.week":{en:"Available this week",hi:"इस सप्ताह उपलब्ध",mr:"या आठवड्यात उपलब्ध"},
"opt.avail.limited":{en:"Limited availability",hi:"सीमित उपलब्धता",mr:"मर्यादित उपलब्धता"},
"opt.all.types":{en:"All work types",hi:"सभी प्रकार के काम",mr:"सर्व प्रकारचे काम"},
"opt.all.wages":{en:"All wages",hi:"सभी वेतन",mr:"सर्व मजुरी"},
"opt.filter.all":{en:"All",hi:"सभी",mr:"सर्व"},
"opt.filter.individual":{en:"Individual",hi:"व्यक्तिगत",mr:"वैयक्तिक"},
"opt.filter.group":{en:"Group",hi:"समूह",mr:"गट"},
"opt.filter.any":{en:"Any",hi:"कोई भी",mr:"कोणताही"},
"btn.save.details":{en:"Save Details",hi:"विवरण सहेजें",mr:"तपशील सेव्ह करा"},
"btn.save.profile":{en:"Save Profile",hi:"प्रोफाइल सहेजें",mr:"प्रोफाइल सेव्ह करा"},
"btn.post.job":{en:"Post Job",hi:"नौकरी पोस्ट करें",mr:"काम पोस्ट करा"},
"btn.cancel":{en:"Cancel",hi:"रद्द करें",mr:"रद्द करा"},
"btn.submit.app":{en:"Submit Application",hi:"आवेदन जमा करें",mr:"अर्ज सादर करा"},
"btn.reset":{en:"Reset Filters",hi:"फ़िल्टर रीसेट करें",mr:"फिल्टर रीसेट करा"},
"btn.search.place":{en:"Search Place",hi:"स्थान खोजें",mr:"स्थान शोधा"},
"btn.mark.all.read":{en:"Mark all read",hi:"सब पढ़े मार्क करें",mr:"सर्व वाचले मार्क करा"},
"btn.post.simple":{en:"Post",hi:"पोस्ट करें",mr:"पोस्ट करा"},
"btn.login":{en:"Login",hi:"लॉगिन",mr:"लॉगिन"},
"btn.register":{en:"Register",hi:"पंजीकरण करें",mr:"नोंदणी करा"},
"btn.demo.login":{en:"Fill Demo Login",hi:"डेमो लॉगिन भरें",mr:"डेमो लॉगिन भरा"},
"btn.open.tutorial":{en:"Open Tutorial",hi:"ट्यूटोरियल खोलें",mr:"ट्युटोरियल उघडा"},
"btn.skip.now":{en:"Skip for now",hi:"अभी छोड़ें",mr:"आत्ता वगळा"},
"btn.play.guide":{en:"Play Full Guide",hi:"पूरा गाइड चलाएं",mr:"पूर्ण मार्गदर्शिका चालवा"},
"btn.repeat.step":{en:"Repeat Step",hi:"चरण दोहराएं",mr:"पाऊल पुन्हा करा"},
"btn.stop.voice":{en:"Stop Voice",hi:"आवाज रोकें",mr:"आवाज थांबवा"},
"btn.open.portal":{en:"Open Official Portal",hi:"आधिकारिक पोर्टल खोलें",mr:"अधिकृत पोर्टल उघडा"},
"btn.backup.search":{en:"Backup Search (myScheme)",hi:"बैकअप खोज (myScheme)",mr:"बॅकअप शोध (myScheme)"},
"btn.voice.guide":{en:"Voice Guide",hi:"वॉइस गाइड",mr:"व्हॉइस मार्गदर्शिका"},
"btn.captcha.refresh":{en:"Refresh",hi:"ताज़ा करें",mr:"रिफ्रेश करा"},
"btn.cancel.hire":{en:"Cancel",hi:"रद्द करें",mr:"रद्द करा"},
"map.kicker":{en:"Choose Location on Map",hi:"नक्शे पर स्थान चुनें",mr:"नकाशावर स्थान निवडा"},
"map.title":{en:"Search or Select Farm Location",hi:"खेत का स्थान खोजें या चुनें",mr:"शेताचे ठिकाण शोधा किंवा निवडा"},
"map.desc":{en:"Search a place like a Google-style location picker, or click on the map to capture the farm location.",hi:"Google जैसे लोकेशन पिकर की तरह जगह खोजें, या खेत का स्थान कैप्चर करने के लिए मानचित्र पर क्लिक करें।",mr:"Google-स्टाइल लोकेशन पिकरप्रमाणे जागा शोधा, किंवा शेताचे ठिकाण कॅप्चर करण्यासाठी नकाशावर क्लिक करा."},
"map.status":{en:"Search a location or click on the map to choose the farm location.",hi:"स्थान खोजें या खेत का स्थान चुनने के लिए मानचित्र पर क्लिक करें।",mr:"स्थान शोधा किंवा शेताचे ठिकाण निवडण्यासाठी नकाशावर क्लिक करा."},
"profile.kicker":{en:"Profile Snapshot",hi:"प्रोफाइल स्नैपशॉट",mr:"प्रोफाइल स्नॅपशॉट"},
"profile.title":{en:"Saved Farmer Summary",hi:"सहेजा किसान सारांश",mr:"सेव्ह केलेला शेतकरी सारांश"},
"profile.not.saved":{en:"Profile not saved yet",hi:"प्रोफाइल अभी सहेजा नहीं",mr:"प्रोफाइल अद्याप सेव्ह नाही"},
"nextstep.label":{en:"Next Best Step",hi:"अगला बेहतर कदम",mr:"पुढील सर्वोत्तम पाऊल"},
"nextstep.strong":{en:"Save the farmer details and choose the farm location.",hi:"किसान विवरण सहेजें और खेत का स्थान चुनें।",mr:"शेतकरी तपशील सेव्ह करा आणि शेताचे ठिकाण निवडा."},
"nextstep.p":{en:"The dashboard will then recommend labour finding, AI support, and relevant schemes.",hi:"डैशबोर्ड तब मजदूर खोज, AI समर्थन और प्रासंगिक योजनाएं सुझाएगा।",mr:"डॅशबोर्ड मग मजूर शोध, AI सहाय्य आणि संबंधित योजना सुचवेल."},
"rec.kicker":{en:"Recommendations",hi:"सुझाव",mr:"शिफारशी"},
"rec.title":{en:"Personalized actions for this farmer",hi:"इस किसान के लिए व्यक्तिगत कार्य",mr:"या शेतकऱ्यासाठी वैयक्तिक कृती"},
"rec.desc":{en:"These cards adapt to the saved location, land area, crop, and farming type.",hi:"ये कार्ड सहेजे स्थान, भूमि क्षेत्र, फसल और खेती के प्रकार के अनुसार बदलते हैं।",mr:"हे कार्ड सेव्ह केलेल्या स्थान, जमीन क्षेत्र, पीक आणि शेतीच्या प्रकारानुसार बदलतात."},
"labour.eyebrow":{en:"Labour Finding",hi:"मजदूर खोज",mr:"मजूर शोध"},
"labour.banner.title":{en:"Find nearby labour, filter available workers, and post a clear labour requirement.",hi:"पास के मजदूर खोजें, उपलब्ध श्रमिकों को फ़िल्टर करें और एक स्पष्ट मजदूर आवश्यकता पोस्ट करें।",mr:"जवळचे मजूर शोधा, उपलब्ध कामगारांना फिल्टर करा आणि स्पष्ट मजूर गरज पोस्ट करा."},
"labour.banner.desc":{en:"This is the core farmer problem-solving section of the prototype.",hi:"यह प्रोटोटाइप का मुख्य किसान समस्या-समाधान खंड है।",mr:"हा प्रोटोटाइपचा मुख्य शेतकरी समस्या-निराकरण विभाग आहे."},
"labour.hire.label":{en:"Hire workers",hi:"मजदूर भाड़े पर लें",mr:"मजूर भाड्याने घ्या"},
"labour.work.label":{en:"Get work",hi:"काम पाएं",mr:"काम मिळवा"},
"labour.step.default":{en:"Choose Hire Workers or Get Work to continue.",hi:"जारी रखने के लिए मजदूर भर्ती करें या काम पाएं चुनें।",mr:"पुढे जाण्यासाठी मजूर भर्ती करा किंवा काम मिळवा निवडा."},
"labour.step.guidance":{en:"Step guidance",hi:"चरण मार्गदर्शन",mr:"पाऊल मार्गदर्शन"},
"labour.hire.kicker":{en:"Hire Workers",hi:"मजदूर भर्ती करें",mr:"मजूर भर्ती करा"},
"labour.hire.step":{en:"Step 1/2: Post a simple order",hi:"चरण 1/2: एक सरल ऑर्डर पोस्ट करें",mr:"पाऊल 1/2: एक साधी ऑर्डर पोस्ट करा"},
"labour.work.kicker":{en:"Get Work",hi:"काम पाएं",mr:"काम मिळवा"},
"labour.work.step":{en:"Step 1/2: Free application",hi:"चरण 1/2: मुफ्त आवेदन",mr:"पाऊल 1/2: मोफत अर्ज"},
"hire.field.worktype":{en:"Work type",hi:"काम का प्रकार",mr:"कामाचा प्रकार"},
"hire.field.location":{en:"Location",hi:"स्थान",mr:"स्थान"},
"hire.field.workers":{en:"No. workers",hi:"श्रमिकों की संख्या",mr:"कामगारांची संख्या"},
"hire.field.wage":{en:"Wage/day",hi:"वेतन/दिन",mr:"मजुरी/दिवस"},
"labour.filter.kicker":{en:"Labour Filters",hi:"मजदूर फ़िल्टर",mr:"मजूर फिल्टर"},
"labour.filter.title":{en:"Filter workers by need and availability",hi:"जरूरत और उपलब्धता के अनुसार श्रमिकों को फ़िल्टर करें",mr:"गरज आणि उपलब्धतेनुसार कामगारांना फिल्टर करा"},
"labour.filter.desc":{en:"Use these filters to quickly narrow labour options.",hi:"श्रम विकल्पों को जल्दी संकीर्ण करने के लिए इन फ़िल्टरों का उपयोग करें।",mr:"मजूर पर्याय जलद कमी करण्यासाठी हे फिल्टर वापरा."},
"labour.filter.type":{en:"Work Type",hi:"काम का प्रकार",mr:"कामाचा प्रकार"},
"labour.filter.indgrp":{en:"Individual / Group",hi:"व्यक्तिगत / समूह",mr:"वैयक्तिक / गट"},
"labour.filter.minwork":{en:"Minimum Workers",hi:"न्यूनतम श्रमिक",mr:"किमान कामगार"},
"labour.filter.avail":{en:"Availability",hi:"उपलब्धता",mr:"उपलब्धता"},
"labour.avail.kicker":{en:"Labour Availability",hi:"मजदूर उपलब्धता",mr:"मजूर उपलब्धता"},
"labour.avail.title":{en:"Available labourers and groups",hi:"उपलब्ध श्रमिक और समूह",mr:"उपलब्ध मजूर आणि गट"},
"labour.avail.showing":{en:"Showing labour support nearby.",hi:"पास के श्रम समर्थन दिखा रहा है।",mr:"जवळचे मजूर सहाय्य दाखवत आहे."},
"labour.matched.kicker":{en:"Matched Suggestions",hi:"मिलान सुझाव",mr:"जुळणाऱ्या सूचना"},
"labour.matched.title":{en:"Likely labour matches",hi:"संभावित मजदूर मिलान",mr:"संभाव्य मजूर जुळणी"},
"schemes.eyebrow":{en:"Government Schemes",hi:"सरकारी योजनाएं",mr:"सरकारी योजना"},
"schemes.banner.title":{en:"See schemes that match land size, crop, and labour-related farmer needs.",hi:"भूमि आकार, फसल और श्रम संबंधित किसान जरूरतों से मेल खाने वाली योजनाएं देखें।",mr:"जमीनीचा आकार, पीक आणि मजूर संबंधित शेतकरी गरजांशी जुळणाऱ्या योजना पहा."},
"schemes.banner.desc":{en:"Filters and recommendations are based on the farmer details saved on the Home page.",hi:"फ़िल्टर और सिफारिशें होम पेज पर सहेजे किसान विवरण पर आधारित हैं।",mr:"फिल्टर आणि शिफारशी मुख्यपृष्ठावर सेव्ह केलेल्या शेतकरी तपशीलांवर आधारित आहेत."},
"schemes.smart.kicker":{en:"Smart Matching",hi:"स्मार्ट मिलान",mr:"स्मार्ट जुळणी"},
"schemes.smart.title":{en:"Recommended scheme summary",hi:"अनुशंसित योजना सारांश",mr:"शिफारस केलेला योजना सारांश"},
"schemes.save.prompt":{en:"Save farmer details on Home to personalize this list.",hi:"इस सूची को व्यक्तिगत बनाने के लिए होम पर किसान विवरण सहेजें।",mr:"ही यादी वैयक्तिक करण्यासाठी मुख्यपृष्ठावर शेतकरी तपशील सेव्ह करा."},
"schemes.filter.all":{en:"All",hi:"सभी",mr:"सर्व"},
"schemes.filter.small":{en:"Small Farmer",hi:"छोटे किसान",mr:"लहान शेतकरी"},
"schemes.filter.crop":{en:"Crop Support",hi:"फसल समर्थन",mr:"पीक समर्थन"},
"schemes.filter.labour":{en:"Labour Support",hi:"मजदूर समर्थन",mr:"मजूर समर्थन"},
"schemes.filter.equip":{en:"Equipment Subsidy",hi:"उपकरण सब्सिडी",mr:"उपकरण अनुदान"},
"schemes.filter.insur":{en:"Insurance",hi:"बीमा",mr:"विमा"},
"schemes.labour.kicker":{en:"Government Schemes",hi:"सरकारी योजनाएं",mr:"सरकारी योजना"},
"schemes.labour.title":{en:"Scheme recommendations for your profile",hi:"आपकी प्रोफाइल के लिए योजना सिफारिशें",mr:"तुमच्या प्रोफाइलसाठी योजना शिफारशी"},
"schemes.labour.desc":{en:"Based on saved farmer details, these scheme options help meet your labour and farming needs.",hi:"सहेजे किसान विवरण के आधार पर, ये योजना विकल्प आपकी जरूरतों को पूरा करते हैं।",mr:"सेव्ह केलेल्या शेतकरी तपशीलांच्या आधारे, हे योजना पर्याय तुमच्या गरजा पूर्ण करतात."},
"schemes.labour.save":{en:"Save farmer details in Home to view personalized scheme recommendations below.",hi:"नीचे व्यक्तिगत योजना सिफारिशें देखने के लिए होम में किसान विवरण सहेजें।",mr:"खाली वैयक्तिक योजना शिफारशी पाहण्यासाठी मुख्यपृष्ठावर शेतकरी तपशील सेव्ह करा."},
"modal.hire.title":{en:"Post a Job",hi:"नौकरी पोस्ट करें",mr:"काम पोस्ट करा"},
"modal.hire.jobtitle":{en:"Job Title",hi:"नौकरी का शीर्षक",mr:"कामाचे शीर्षक"},
"modal.hire.jobdesc":{en:"Job Description",hi:"नौकरी विवरण",mr:"कामाचे वर्णन"},
"modal.hire.workers":{en:"Number of Workers Needed",hi:"आवश्यक श्रमिकों की संख्या",mr:"आवश्यक कामगारांची संख्या"},
"modal.hire.date":{en:"Date Required",hi:"आवश्यक तारीख",mr:"आवश्यक तारीख"},
"modal.hire.time":{en:"Time Required",hi:"आवश्यक समय",mr:"आवश्यक वेळ"},
"modal.hire.location":{en:"Location",hi:"स्थान",mr:"स्थान"},
"modal.hire.wage":{en:"Daily Wage (in Rs.)",hi:"दैनिक वेतन (रु.)",mr:"दैनिक मजुरी (रु.)"},
"modal.hire.skillsreq":{en:"Skills Required (Optional)",hi:"आवश्यक कौशल (वैकल्पिक)",mr:"आवश्यक कौशल्ये (ऐच्छिक)"},
"modal.hire.contact":{en:"Contact Mobile Number",hi:"संपर्क मोबाइल नंबर",mr:"संपर्क मोबाइल नंबर"},
"modal.apply.title":{en:"Browse & Apply for Jobs",hi:"नौकरियां देखें और आवेदन करें",mr:"काम पहा आणि अर्ज करा"},
"modal.apply.nojobs":{en:"No jobs available. Try different filters.",hi:"कोई नौकरी उपलब्ध नहीं। अलग फ़िल्टर आज़माएं।",mr:"कोणतेही काम उपलब्ध नाही. वेगळे फिल्टर वापरा."},
"modal.jobapp.title":{en:"Apply for Job",hi:"नौकरी के लिए आवेदन करें",mr:"कामासाठी अर्ज करा"},
"field.yourname":{en:"Your Full Name",hi:"आपका पूरा नाम",mr:"तुमचे पूर्ण नाव"},
"field.yourexp":{en:"Your Experience (Years)",hi:"आपका अनुभव (वर्ष)",mr:"तुमचा अनुभव (वर्षे)"},
"field.yourskills":{en:"Your Skills",hi:"आपके कौशल",mr:"तुमची कौशल्ये"},
"field.coverletter":{en:"Why are you interested in this job?",hi:"आप इस नौकरी में क्यों रुचि रखते हैं?",mr:"तुम्हाला या कामात का रस आहे?"},
"field.avail.check":{en:"I am available on the specified date",hi:"मैं निर्दिष्ट तारीख पर उपलब्ध हूं",mr:"मी निर्दिष्ट तारखेला उपलब्ध आहे"},
"modal.guide.welcome.title":{en:"Welcome to AgriShield",hi:"एग्रीशील्ड में आपका स्वागत है",mr:"अ‍ॅग्रीशील्डमध्ये आपले स्वागत आहे"},
"modal.guide.welcome.desc":{en:"This one-time guide helps you understand login, profile setup, labour finding, and scheme flow.",hi:"यह एक बार का गाइड लॉगिन, प्रोफाइल सेटअप, मजदूर खोज और योजना प्रवाह समझने में मदद करता है।",mr:"हा एकवेळचा मार्गदर्शक लॉगिन, प्रोफाइल सेटअप, मजूर शोध आणि योजना प्रवाह समजण्यास मदत करतो."},
"modal.tutorial.title":{en:"App Tutorial / Guide",hi:"ऐप ट्यूटोरियल / गाइड",mr:"अ‍ॅप ट्युटोरियल / मार्गदर्शिका"},
"guide.app.eyebrow":{en:"App Guide",hi:"ऐप गाइड",mr:"अ‍ॅप मार्गदर्शिका"},
"guide.follow.steps":{en:"Follow these steps",hi:"इन चरणों का पालन करें",mr:"हे पाऊले अनुसरा"},
"guide.use.tutorial":{en:"Use this tutorial directly from the dashboard.",hi:"इस ट्यूटोरियल को सीधे डैशबोर्ड से उपयोग करें।",mr:"हे ट्युटोरियल थेट डॅशबोर्डमधून वापरा."},
"guide.voice.eyebrow":{en:"Voice Help",hi:"आवाज सहायता",mr:"आवाज सहाय्य"},
"guide.voice.title":{en:"Listen and control by voice",hi:"सुनें और आवाज से नियंत्रण करें",mr:"ऐका आणि आवाजाने नियंत्रण करा"},
"guide.voice.desc":{en:"Use the buttons to listen to each step.",hi:"प्रत्येक चरण सुनने के लिए बटन का उपयोग करें।",mr:"प्रत्येक पाऊल ऐकण्यासाठी बटण वापरा."},
"guide.voice.label":{en:"Voice Language",hi:"आवाज भाषा",mr:"आवाज भाषा"},
"guide.voice.ready":{en:"Voice help is ready. Press Play Full Guide to start.",hi:"आवाज सहायता तैयार है। शुरू करने के लिए पूरा गाइड चलाएं दबाएं।",mr:"आवाज सहाय्य तयार आहे. सुरू करण्यासाठी पूर्ण मार्गदर्शिका चालवा दाबा."},
"scheme.guide.title":{en:"Scheme Guide",hi:"योजना गाइड",mr:"योजना मार्गदर्शिका"},
"scheme.guide.kicker":{en:"Step-by-step application support",hi:"चरण-दर-चरण आवेदन समर्थन",mr:"टप्प्याटप्प्याने अर्ज सहाय्य"},
"scheme.guide.summary":{en:"Use this friendly checklist to apply without confusion.",hi:"बिना भ्रम के आवेदन करने के लिए इस मैत्रीपूर्ण चेकलिस्ट का उपयोग करें।",mr:"गोंधळाशिवाय अर्ज करण्यासाठी ही मैत्रीपूर्ण चेकलिस्ट वापरा."},
"scheme.guide.source":{en:"Reference source details appear here.",hi:"संदर्भ स्रोत विवरण यहाँ दिखाई देते हैं।",mr:"संदर्भ स्रोत तपशील येथे दिसतात."},
"scheme.guide.why":{en:"Why this scheme is important",hi:"यह योजना क्यों महत्वपूर्ण है",mr:"ही योजना का महत्त्वाची आहे"},
"scheme.guide.how":{en:"How to apply",hi:"कैसे आवेदन करें",mr:"कसे अर्ज करावे"},
"scheme.guide.tip":{en:"Tap each step circle to mark it done while helping the farmer.",hi:"किसान की मदद करते समय प्रत्येक चरण सर्कल को पूर्ण मार्क करने के लिए टैप करें।",mr:"शेतकऱ्याला मदत करताना प्रत्येक पाऊलाचे वर्तुळ पूर्ण मार्क करण्यासाठी टॅप करा."},
"notif.title":{en:"Notifications",hi:"सूचनाएं",mr:"सूचना"},
"notif.latest":{en:"Latest updates",hi:"नवीनतम अपडेट",mr:"नवीनतम अपडेट"},
"notif.filter.all":{en:"All",hi:"सभी",mr:"सर्व"},
"notif.filter.scheme":{en:"Schemes",hi:"योजनाएं",mr:"योजना"},
"notif.filter.selection":{en:"Selections",hi:"चयन",mr:"निवड"},
"notif.filter.request":{en:"Requests",hi:"अनुरोध",mr:"विनंती"},
"notif.chip.schemes":{en:"Schemes",hi:"योजनाएं",mr:"योजना"},
"notif.chip.selections":{en:"Selections",hi:"चयन",mr:"निवड"},
"notif.chip.requests":{en:"Requests",hi:"अनुरोध",mr:"विनंती"},
"login.eyebrow":{en:"Best Labour Support",hi:"सर्वश्रेष्ठ श्रम समर्थन",mr:"सर्वोत्तम मजूर सहाय्य"},
"login.story.h1":{en:"Simple login for a farmer-first labour support dashboard.",hi:"किसान-प्रथम श्रम सहायता डैशबोर्ड के लिए सरल लॉगिन।",mr:"शेतकरी-प्रथम मजूर सहाय्य डॅशबोर्डसाठी सोपे लॉगिन."},
"login.story.p":{en:"Registered users can sign in with a username, password, and a small math CAPTCHA. This keeps the prototype easy to demo.",hi:"पंजीकृत उपयोगकर्ता उपयोगकर्ता नाम, पासवर्ड और एक छोटे गणित CAPTCHA के साथ साइन इन कर सकते हैं।",mr:"नोंदणीकृत वापरकर्ते वापरकर्तानाव, पासवर्ड आणि एक लहान गणित CAPTCHA सह साइन इन करू शकतात."},
"login.card.proto":{en:"Prototype Auth",hi:"प्रोटोटाइप प्रमाणीकरण",mr:"प्रोटोटाइप प्रमाणीकरण"},
"login.card.proto.p":{en:"Frontend-only registration and login stored in localStorage.",hi:"केवल फ्रंटएंड पंजीकरण और लॉगिन localStorage में।",mr:"केवळ फ्रंटएंड नोंदणी आणि लॉगिन localStorage मध्ये."},
"login.card.labour":{en:"Labour Access",hi:"मजदूर पहुंच",mr:"मजूर प्रवेश"},
"login.card.labour.p":{en:"Find workers, post labour needs, and present the full labour-support flow clearly.",hi:"मजदूर खोजें, श्रम जरूरतें पोस्ट करें और पूरा प्रवाह स्पष्ट रूप से प्रस्तुत करें।",mr:"मजूर शोधा, मजूर गरजा पोस्ट करा आणि संपूर्ण प्रवाह स्पष्टपणे सादर करा."},
"login.card.farmer":{en:"Farmer Support",hi:"किसान समर्थन",mr:"शेतकरी सहाय्य"},
"login.card.farmer.p":{en:"Connect labour planning with AI guidance and government schemes.",hi:"श्रम नियोजन को AI मार्गदर्शन और सरकारी योजनाओं से जोड़ें।",mr:"मजूर नियोजनाला AI मार्गदर्शन आणि सरकारी योजनांशी जोडा."},
"login.panel.label":{en:"Demo Ready",hi:"डेमो तैयार",mr:"डेमो तयार"},
"login.panel.strong":{en:"Fast to explain and easy to use",hi:"समझाने में आसान और उपयोग में सरल",mr:"समजावण्यास जलद आणि वापरण्यास सोपे"},
"login.panel.p":{en:"No OTP, no backend, no complex setup. The auth flow is minimal but realistic enough for a hackathon demo.",hi:"कोई OTP नहीं, कोई बैकएंड नहीं। प्रमाणीकरण प्रवाह न्यूनतम लेकिन यथार्थवादी है।",mr:"OTP नाही, बॅकएंड नाही. प्रमाणीकरण प्रवाह कमीतकमी पण वास्तवदर्शी आहे."},
"login.form.eyebrow":{en:"Login",hi:"लॉगिन",mr:"लॉगिन"},
"login.form.title":{en:"Enter your dashboard",hi:"अपना डैशबोर्ड दर्ज करें",mr:"तुमचा डॅशबोर्ड उघडा"},
"login.form.desc":{en:"Use your registered username and password, then solve the CAPTCHA to continue.",hi:"अपने पंजीकृत उपयोगकर्ता नाम और पासवर्ड का उपयोग करें, फिर CAPTCHA हल करें।",mr:"तुमचे नोंदणीकृत वापरकर्तानाव आणि पासवर्ड वापरा, मग CAPTCHA सोडवून पुढे जा."},
"login.note":{en:"User data is stored only in localStorage for the prototype. No backend or encryption is used.",hi:"उपयोगकर्ता डेटा केवल प्रोटोटाइप के लिए localStorage में संग्रहीत है। कोई बैकएंड नहीं।",mr:"वापरकर्ता डेटा केवळ प्रोटोटाइपसाठी localStorage मध्ये साठवला आहे. कोणताही बॅकएंड नाही."},
"login.switch":{en:"Don't have an account?",hi:"खाता नहीं है?",mr:"खाते नाही?"},
"login.switch.link":{en:"Register here",hi:"यहाँ पंजीकरण करें",mr:"येथे नोंदणी करा"},
"reg.eyebrow":{en:"Best Labour Support",hi:"सर्वश्रेष्ठ श्रम समर्थन",mr:"सर्वोत्तम मजूर सहाय्य"},
"reg.story.h1":{en:"Create a simple account and enter the farmer labour support platform.",hi:"एक सरल खाता बनाएं और किसान श्रम सहायता प्लेटफॉर्म में प्रवेश करें।",mr:"एक साधे खाते तयार करा आणि शेतकरी मजूर सहाय्य व्यासपीठात प्रवेश करा."},
"reg.story.p":{en:"Registration helps us understand your problems. After that, the farmer or labour user can log in, save profile details, and use Home, Labour Finding, Tutorial, and Government Schemes.",hi:"पंजीकरण हमें आपकी समस्याओं को समझने में मदद करता है। उसके बाद होम, मजदूर खोज, ट्यूटोरियल और सरकारी योजनाओं का उपयोग करें।",mr:"नोंदणी आम्हाला तुमच्या समस्या समजण्यास मदत करते. त्यानंतर मुख्यपृष्ठ, मजूर शोध, ट्युटोरियल आणि सरकारी योजना वापरा."},
"reg.card.fast":{en:"Register Fast",hi:"जल्दी पंजीकरण करें",mr:"जलद नोंदणी करा"},
"reg.card.fast.p":{en:"Create a demo account with username, mobile number, and password.",hi:"उपयोगकर्ता नाम, मोबाइल नंबर और पासवर्ड के साथ एक डेमो खाता बनाएं।",mr:"वापरकर्तानाव, मोबाइल नंबर आणि पासवर्डसह डेमो खाते तयार करा."},
"reg.card.valid":{en:"Basic Validation",hi:"बुनियादी सत्यापन",mr:"मूलभूत प्रमाणीकरण"},
"reg.card.valid.p":{en:"Password match and required field checks keep the auth flow realistic.",hi:"पासवर्ड मिलान और आवश्यक फ़ील्ड जांच प्रमाणीकरण प्रवाह को यथार्थवादी रखती है।",mr:"पासवर्ड जुळणी आणि आवश्यक फील्ड तपासणी प्रमाणीकरण प्रवाह वास्तवदर्शी ठेवते."},
"reg.card.dash":{en:"Dashboard Ready",hi:"डैशबोर्ड तैयार",mr:"डॅशबोर्ड तयार"},
"reg.card.dash.p":{en:"After login, the user can directly explore Home, labour finding, tutorial guidance, and schemes.",hi:"लॉगिन के बाद, उपयोगकर्ता होम, मजदूर खोज, ट्यूटोरियल और योजनाओं का अन्वेषण कर सकता है।",mr:"लॉगिन नंतर, वापरकर्ता मुख्यपृष्ठ, मजूर शोध, ट्युटोरियल आणि योजना एक्सप्लोर करू शकतो."},
"reg.form.eyebrow":{en:"Register",hi:"पंजीकरण",mr:"नोंदणी"},
"reg.form.title":{en:"Create your account",hi:"अपना खाता बनाएं",mr:"तुमचे खाते तयार करा"},
"reg.form.desc":{en:"Fill the fields below and save the user in localStorage for this prototype.",hi:"नीचे के फ़ील्ड भरें और इस प्रोटोटाइप के लिए उपयोगकर्ता को localStorage में सहेजें।",mr:"खालील फील्ड भरा आणि या प्रोटोटाइपसाठी वापरकर्त्याला localStorage मध्ये सेव्ह करा."},
"reg.switch":{en:"Already have an account?",hi:"पहले से खाता है?",mr:"आधीच खाते आहे?"},
"reg.switch.link":{en:"Login here",hi:"यहाँ लॉगिन करें",mr:"येथे लॉगिन करा"}
};

var STORAGE_KEY="agrishield_lang";
var SUPPORTED=["en","hi","mr"];

function getSaved(){try{return localStorage.getItem(STORAGE_KEY)||"en";}catch(e){return"en";}}
function save(lang){try{localStorage.setItem(STORAGE_KEY,lang);}catch(e){}}
function t(key,lang){var e=T[key];if(!e)return key;return e[lang]||e["en"]||key;}

function applyLang(lang){
  if(SUPPORTED.indexOf(lang)===-1)lang="en";

  /* textContent */
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    el.textContent=t(el.getAttribute("data-i18n"),lang);
  });
  /* placeholder */
  document.querySelectorAll("[data-i18n-ph]").forEach(function(el){
    el.placeholder=t(el.getAttribute("data-i18n-ph"),lang);
  });
  /* title attr */
  document.querySelectorAll("[data-i18n-title]").forEach(function(el){
    el.title=t(el.getAttribute("data-i18n-title"),lang);
  });
  /* aria-label */
  document.querySelectorAll("[data-i18n-aria]").forEach(function(el){
    el.setAttribute("aria-label",t(el.getAttribute("data-i18n-aria"),lang));
  });
  /* sync all dropdowns */
  document.querySelectorAll("[data-ui-language-select]").forEach(function(s){s.value=lang;});
  /* html lang */
  document.documentElement.lang=lang==="hi"?"hi":lang==="mr"?"mr":"en";
  /* Devanagari font */
  if(lang==="hi"||lang==="mr"){
    if(!document.getElementById("agri-dev-font")){
      var lk=document.createElement("link");
      lk.id="agri-dev-font";lk.rel="stylesheet";
      lk.href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(lk);
    }
    document.body.style.fontFamily="'Noto Sans Devanagari','Manrope',sans-serif";
  } else {
    document.body.style.fontFamily="";
  }
  document.dispatchEvent(new CustomEvent("agri:langchange",{detail:{lang:lang}}));
}

global.AgriI18n={
  t:t,
  apply:function(lang){save(lang);applyLang(lang);},
  current:getSaved,
  init:function(){
    var lang=getSaved();
    applyLang(lang);
    document.querySelectorAll("[data-ui-language-select]").forEach(function(sel){
      sel.value=lang;
      sel.addEventListener("change",function(){global.AgriI18n.apply(this.value);});
    });
  }
};

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",function(){global.AgriI18n.init();});
}else{
  global.AgriI18n.init();
}
}(window));
