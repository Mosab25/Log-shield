# First 3 complete cybersecurity exams with 30 questions each
# Additional exams will be added in subsequent iterations

QUIZ_SEED_DATA = [
    {
        "slug": "cybersecurity-fundamentals",
        "title": "Cybersecurity Fundamentals",
        "description": "Essential cybersecurity concepts and principles",
        "category": "Security Fundamentals",
        "type": "awareness",
        "difficulty": "beginner",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is the primary goal of cybersecurity?",
                "options": ["To protect digital assets from unauthorized access", "To make systems run faster", "To reduce IT costs", "To increase productivity"],
                "correct_option_index": 0,
                "explanation": "Cybersecurity aims to protect digital assets and systems from unauthorized access and damage."
            },
            {
                "question_text": "Which is NOT a CIA triad principle?",
                "options": ["Confidentiality", "Integrity", "Availability", "Accessibility"],
                "correct_option_index": 3,
                "explanation": "The CIA triad consists of Confidentiality, Integrity, and Availability."
            },
            {
                "question_text": "What does confidentiality ensure?",
                "options": ["Information is kept secret", "Information is accurate", "Information is available", "Information is backed up"],
                "correct_option_index": 0,
                "explanation": "Confidentiality prevents unauthorized disclosure of information."
            },
            {
                "question_text": "What is a threat in cybersecurity?",
                "options": ["A vulnerability that can be exploited", "Any potential danger to systems", "A security control", "A successful attack"],
                "correct_option_index": 1,
                "explanation": "A threat is any potential danger that can exploit vulnerabilities."
            },
            {
                "question_text": "Which is a physical security threat?",
                "options": ["Computer virus", "Phishing email", "Unauthorized server room access", "SQL injection"],
                "correct_option_index": 2,
                "explanation": "Physical threats involve unauthorized physical access to assets."
            },
            {
                "question_text": "What is risk assessment purpose?",
                "options": ["Identify and evaluate risks", "Implement controls", "Train employees", "Monitor traffic"],
                "correct_option_index": 0,
                "explanation": "Risk assessment identifies and evaluates potential risks."
            },
            {
                "question_text": "What does integrity ensure?",
                "options": ["Information is secret", "Information is accurate", "Information is available", "Information is encrypted"],
                "correct_option_index": 1,
                "explanation": "Integrity ensures information accuracy and prevents unauthorized modification."
            },
            {
                "question_text": "Which is a cybersecurity framework?",
                "options": ["ISO 9001", "NIST Cybersecurity Framework", "Six Sigma", "Agile"],
                "correct_option_index": 1,
                "explanation": "NIST Cybersecurity Framework is widely adopted for risk management."
            },
            {
                "question_text": "What is a vulnerability?",
                "options": ["A successful attack", "A weakness that can be exploited", "A security control", "Malware type"],
                "correct_option_index": 1,
                "explanation": "A vulnerability is a weakness that can be exploited by threats."
            },
            {
                "question_text": "What does availability mean?",
                "options": ["Information is secret", "Information is accurate", "Systems are accessible when needed", "Information is encrypted"],
                "correct_option_index": 2,
                "explanation": "Availability ensures systems and information are accessible when needed."
            },
            {
                "question_text": "Which is NOT malware?",
                "options": ["Virus", "Firewall", "Trojan", "Ransomware"],
                "correct_option_index": 1,
                "explanation": "Firewall is a security control, not malware."
            },
            {
                "question_text": "What is social engineering?",
                "options": ["Writing secure code", "Configuring firewalls", "Manipulating people to reveal information", "Encrypting data"],
                "correct_option_index": 2,
                "explanation": "Social engineering manipulates people into revealing confidential information."
            },
            {
                "question_text": "What is authentication purpose?",
                "options": ["Encrypt data", "Verify user identity", "Block traffic", "Monitor performance"],
                "correct_option_index": 1,
                "explanation": "Authentication verifies the identity of users or systems."
            },
            {
                "question_text": "Which is a strong password practice?",
                "options": ["Using 'password123'", "Using letters, numbers, symbols", "Using birthdays", "Using dictionary words"],
                "correct_option_index": 1,
                "explanation": "Strong passwords use combinations of letters, numbers, and symbols."
            },
            {
                "question_text": "What is a zero-day vulnerability?",
                "options": ["Immediately fixed", "Unknown to vendor", "Mobile only", "No impact"],
                "correct_option_index": 1,
                "explanation": "Zero-day vulnerabilities are unknown to vendors when discovered."
            },
            {
                "question_text": "What is encryption purpose?",
                "options": ["Speed up data", "Secure data with keys", "Compress data", "Organize data"],
                "correct_option_index": 1,
                "explanation": "Encryption converts data to a secure format readable only with keys."
            },
            {
                "question_text": "Which is an authentication factor?",
                "options": ["Password", "Token", "Biometric", "All above"],
                "correct_option_index": 3,
                "explanation": "Factors include knowledge, possession, and biometrics."
            },
            {
                "question_text": "What is a DoS attack?",
                "options": ["Stealing data", "Making service unavailable", "Gaining access", "Modifying content"],
                "correct_option_index": 1,
                "explanation": "DoS attacks make services unavailable to legitimate users."
            },
            {
                "question_text": "What is firewall purpose?",
                "options": ["Encrypt traffic", "Filter traffic based on rules", "Store passwords", "Generate reports"],
                "correct_option_index": 1,
                "explanation": "Firewalls monitor and filter network traffic based on security rules."
            },
            {
                "question_text": "What is phishing?",
                "options": ["File-encrypting malware", "Tricking users to reveal info", "Firewall bypass", "Network scanning"],
                "correct_option_index": 1,
                "explanation": "Phishing tricks users into revealing sensitive information."
            },
            {
                "question_text": "What is least privilege principle?",
                "options": ["Maximum privileges", "Minimum necessary privileges", "No privileges", "Seniority-based"],
                "correct_option_index": 1,
                "explanation": "Least privilege gives users only minimum necessary privileges."
            },
            {
                "question_text": "What is malware?",
                "options": ["Harmful software", "Legitimate security software", "Hardware devices", "Monitoring tools"],
                "correct_option_index": 0,
                "explanation": "Malware is software designed to harm or exploit systems."
            },
            {
                "question_text": "What is incident response purpose?",
                "options": ["Prevent incidents", "Manage breach aftermath", "Design secure systems", "Train employees"],
                "correct_option_index": 1,
                "explanation": "Incident response manages the aftermath of security breaches."
            },
            {
                "question_text": "What is security policy?",
                "options": ["Antivirus software", "Firewall config", "Security rules document", "Password tool"],
                "correct_option_index": 2,
                "explanation": "Security policy documents security rules and procedures."
            },
            {
                "question_text": "What is business continuity?",
                "options": ["Increase profits", "Continue functions during disaster", "Hire employees", "Expand markets"],
                "correct_option_index": 1,
                "explanation": "Business continuity ensures operations continue during disasters."
            },
            {
                "question_text": "What is disaster recovery goal?",
                "options": ["Prevent disasters", "Restore systems after disaster", "Train response", "Document incidents"],
                "correct_option_index": 1,
                "explanation": "Disaster recovery restores systems after disruptions."
            },
            {
                "question_text": "What is data classification?",
                "options": ["Delete data", "Organize by sensitivity", "Encrypt data", "Backup data"],
                "correct_option_index": 1,
                "explanation": "Data classification organizes information by sensitivity levels."
            },
            {
                "question_text": "What is security awareness training?",
                "options": ["Teach secure coding", "Educate on risks", "Configure systems", "Monitor activity"],
                "correct_option_index": 1,
                "explanation": "Security awareness training educates employees about risks."
            },
            {
                "question_text": "What is access control?",
                "options": ["Building access", "Restrict system access", "Monitor internet", "Manage schedules"],
                "correct_option_index": 1,
                "explanation": "Access control restricts access to systems and data."
            },
            {
                "question_text": "What is a security incident?",
                "options": ["Security test", "Breach of confidentiality/integrity/availability", "Routine check", "Software update"],
                "correct_option_index": 1,
                "explanation": "Security incidents compromise data confidentiality, integrity, or availability."
            },
            {
                "question_text": "What is security monitoring purpose?",
                "options": ["Block traffic", "Detect security events", "Encrypt communications", "Manage accounts"],
                "correct_option_index": 1,
                "explanation": "Security monitoring detects and responds to security events."
            }
        ]
    }
]
