# Simple quiz seed data - first 3 exams with 30 questions each

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
    },
    {
        "slug": "network-security-essentials",
        "title": "Network Security Essentials",
        "description": "Core concepts for securing network infrastructure",
        "category": "Network Security",
        "type": "network",
        "difficulty": "beginner",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is firewall primary function?",
                "options": ["Encrypt traffic", "Filter traffic by rules", "Manage auth", "Backup data"],
                "correct_option_index": 1,
                "explanation": "Firewalls filter network traffic based on security rules."
            },
            {
                "question_text": "Which protocol for secure remote access?",
                "options": ["HTTP", "FTP", "SSH", "Telnet"],
                "correct_option_index": 2,
                "explanation": "SSH provides encrypted remote access and secure file transfer."
            },
            {
                "question_text": "What is a DMZ?",
                "options": ["Isolated segment", "Buffer zone between internal/external", "Secure internal area", "Backup connection"],
                "correct_option_index": 1,
                "explanation": "DMZ sits between internal and external networks for public services."
            },
            {
                "question_text": "Which firewall operates at transport layer?",
                "options": ["Packet filter", "Stateful inspection", "Proxy", "Next-gen"],
                "correct_option_index": 1,
                "explanation": "Stateful inspection operates at Layer 4 tracking connection states."
            },
            {
                "question_text": "What is NAT purpose?",
                "options": ["Encrypt traffic", "Hide internal IPs", "Monitor performance", "Block traffic"],
                "correct_option_index": 1,
                "explanation": "NAT hides internal addresses and conserves public IPs."
            },
            {
                "question_text": "Which protocol secures web browsing?",
                "options": ["HTTP", "FTP", "HTTPS", "SMTP"],
                "correct_option_index": 2,
                "explanation": "HTTPS uses SSL/TLS to secure web traffic."
            },
            {
                "question_text": "What is a VPN?",
                "options": ["Private building network", "Encrypted connection over public network", "Monitoring tool", "Firewall type"],
                "correct_option_index": 1,
                "explanation": "VPN creates encrypted tunnels over public networks."
            },
            {
                "question_text": "What is intrusion detection system?",
                "options": ["Prevents attacks", "Detects suspicious activity", "Encrypts data", "Manages users"],
                "correct_option_index": 1,
                "explanation": "IDS detects and monitors suspicious network activity."
            },
            {
                "question_text": "What is port scanning?",
                "options": ["Encrypting ports", "Scanning for open ports", "Closing ports", "Monitoring ports"],
                "correct_option_index": 1,
                "explanation": "Port scanning identifies open ports on network systems."
            },
            {
                "question_text": "What is a subnet mask?",
                "options": ["Encrypts subnets", "Defines network portion of IP", "Blocks subnets", "Monitors subnets"],
                "correct_option_index": 1,
                "explanation": "Subnet mask separates network and host portions of IP addresses."
            },
            {
                "question_text": "What is MAC filtering?",
                "options": ["Filters MAC addresses", "Encrypts MACs", "Blocks MACs", "Monitors MACs"],
                "correct_option_index": 0,
                "explanation": "MAC filtering allows/denies access based on MAC addresses."
            },
            {
                "question_text": "What is VLAN?",
                "options": ["Virtual LAN segment", "Encrypted LAN", "Backup LAN", "Monitor LAN"],
                "correct_option_index": 0,
                "explanation": "VLAN logically segments physical networks into virtual networks."
            },
            {
                "question_text": "What is network segmentation?",
                "options": ["Encrypting networks", "Dividing networks into segments", "Connecting networks", "Monitoring networks"],
                "correct_option_index": 1,
                "explanation": "Network segmentation divides networks into smaller segments."
            },
            {
                "question_text": "What is a proxy server?",
                "options": ["Encrypts traffic", "Intermediary for requests", "Blocks traffic", "Monitors traffic"],
                "correct_option_index": 1,
                "explanation": "Proxy servers act as intermediaries for client requests."
            },
            {
                "question_text": "What is network access control (NAC)?",
                "options": ["Blocks all access", "Controls device network access", "Encrypts access", "Monitors access"],
                "correct_option_index": 1,
                "explanation": "NAC controls which devices can access the network."
            },
            {
                "question_text": "What is ARP?",
                "options": ["Address Resolution Protocol", "Advanced Routing Protocol", "Authentication Request Protocol", "Access Recovery Protocol"],
                "correct_option_index": 0,
                "explanation": "ARP maps IP addresses to MAC addresses."
            },
            {
                "question_text": "What is DNSSEC?",
                "options": ["DNS encryption", "DNS security extensions", "DNS monitoring", "DNS backup"],
                "correct_option_index": 1,
                "explanation": "DNSSEC adds security to DNS responses."
            },
            {
                "question_text": "What is a honeypot?",
                "options": ["Secure server", "Decoy system to attract attackers", "Backup system", "Monitor system"],
                "correct_option_index": 1,
                "explanation": "Honeypots are decoy systems to detect and study attackers."
            },
            {
                "question_text": "What is network segmentation purpose?",
                "options": ["Speed up network", "Improve security and performance", "Encrypt traffic", "Monitor traffic"],
                "correct_option_index": 1,
                "explanation": "Segmentation improves security by containing breaches."
            },
            {
                "question_text": "What is a next-gen firewall?",
                "options": ["Basic packet filter", "Advanced threat protection", "Simple stateful", "Proxy only"],
                "correct_option_index": 1,
                "explanation": "Next-gen firewalls provide advanced threat protection capabilities."
            },
            {
                "question_text": "What is SDN?",
                "options": ["Secure DNS Network", "Software-Defined Networking", "Secure Data Network", "System Data Network"],
                "correct_option_index": 1,
                "explanation": "SDN separates network control from forwarding functions."
            },
            {
                "question_text": "What is network access control?",
                "options": ["Block all devices", "Control device access based on compliance", "Encrypt devices", "Monitor devices"],
                "correct_option_index": 1,
                "explanation": "NAC controls network access based on device compliance."
            },
            {
                "question_text": "What is a network tap?",
                "options": ["Block traffic", "Monitor traffic passively", "Encrypt traffic", "Route traffic"],
                "correct_option_index": 1,
                "explanation": "Network taps passively monitor network traffic."
            },
            {
                "question_text": "What is port security?",
                "options": ["Encrypt ports", "Control switch port access", "Monitor ports", "Block ports"],
                "correct_option_index": 1,
                "explanation": "Port security controls which devices can connect to switch ports."
            },
            {
                "question_text": "What is a bastion host?",
                "options": ["Regular server", "Hardened exposed server", "Backup server", "Monitor server"],
                "correct_option_index": 1,
                "explanation": "Bastion hosts are hardened servers exposed to external networks."
            },
            {
                "question_text": "What is network segmentation benefit?",
                "options": ["Faster speeds", "Breach containment", "More IPs", "Less monitoring"],
                "correct_option_index": 1,
                "explanation": "Segmentation contains breaches to limited network areas."
            },
            {
                "question_text": "What is a web application firewall?",
                "options": ["Blocks all web traffic", "Filters HTTP traffic", "Encrypts HTTP", "Monitors HTTP"],
                "correct_option_index": 1,
                "explanation": "WAFs filter and monitor HTTP traffic for web applications."
            },
            {
                "question_text": "What is network telemetry?",
                "options": ["Encrypt network data", "Collect network performance data", "Block network traffic", "Route network traffic"],
                "correct_option_index": 1,
                "explanation": "Telemetry collects network performance and operational data."
            },
            {
                "question_text": "What is a network perimeter?",
                "options": ["Network center", "Boundary between internal/external", "Network backup", "Network monitor"],
                "correct_option_index": 1,
                "explanation": "Network perimeter is the boundary between trusted and untrusted networks."
            },
            {
                "question_text": "What is zero trust networking?",
                "options": ["Trust all internal traffic", "Never trust, always verify", "Trust external traffic", "No verification needed"],
                "correct_option_index": 1,
                "explanation": "Zero trust assumes no implicit trust and verifies all requests."
            }
        ]
    },
    {
        "slug": "web-application-security-basics",
        "title": "Web Application Security Basics",
        "description": "Essential concepts for securing web applications",
        "category": "Web Application Security",
        "type": "technical",
        "difficulty": "beginner",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is OWASP Top 10?",
                "options": ["Top 10 firewalls", "Top 10 web security risks", "Top 10 secure coding practices", "Top 10 network protocols"],
                "correct_option_index": 1,
                "explanation": "OWASP Top 10 lists the most critical web application security risks."
            },
            {
                "question_text": "What is SQL injection?",
                "options": ["Database encryption", "Injecting malicious SQL queries", "SQL backup", "SQL monitoring"],
                "correct_option_index": 1,
                "explanation": "SQL injection inserts malicious SQL into queries to manipulate databases."
            },
            {
                "question_text": "What is XSS?",
                "options": ["Cross-site scripting", "Cross-site request forgery", "XML security", "External security"],
                "correct_option_index": 0,
                "explanation": "XSS (Cross-Site Scripting) injects scripts into web pages viewed by users."
            },
            {
                "question_text": "What is CSRF?",
                "options": ["Cross-site scripting", "Cross-site request forgery", "Client-side security", "Server security"],
                "correct_option_index": 1,
                "explanation": "CSRF tricks users into performing unwanted actions on web applications."
            },
            {
                "question_text": "What is input validation?",
                "options": ["Validate user input", "Validate server input", "Validate database", "Validate network"],
                "correct_option_index": 0,
                "explanation": "Input validation ensures user input meets expected criteria."
            },
            {
                "question_text": "What is output encoding?",
                "options": ["Encode input", "Encode output", "Encode database", "Encode network"],
                "correct_option_index": 1,
                "explanation": "Output encoding converts data to safe formats to prevent injection attacks."
            },
            {
                "question_text": "What is HTTPS?",
                "options": ["HTTP with security", "HTTP with encryption", "HTTP with authentication", "HTTP with monitoring"],
                "correct_option_index": 1,
                "explanation": "HTTPS encrypts HTTP communications using SSL/TLS."
            },
            {
                "question_text": "What is a web application firewall?",
                "options": ["Blocks all traffic", "Filters HTTP traffic", "Encrypts HTTP", "Monitors HTTP"],
                "correct_option_index": 1,
                "explanation": "WAF filters and monitors HTTP traffic for web applications."
            },
            {
                "question_text": "What is session management?",
                "options": ["Manage user sessions", "Manage database sessions", "Manage network sessions", "Manage backup sessions"],
                "correct_option_index": 0,
                "explanation": "Session management handles user authentication sessions."
            },
            {
                "question_text": "What is authentication?",
                "options": ["Verify identity", "Authorize access", "Encrypt data", "Monitor activity"],
                "correct_option_index": 0,
                "explanation": "Authentication verifies user identity before granting access."
            },
            {
                "question_text": "What is authorization?",
                "options": ["Verify identity", "Grant permissions", "Encrypt data", "Monitor activity"],
                "correct_option_index": 1,
                "explanation": "Authorization determines what authenticated users can access."
            },
            {
                "question_text": "What is secure cookie?",
                "options": ["Encrypted cookie", "Cookie with security flags", "Backup cookie", "Monitor cookie"],
                "correct_option_index": 1,
                "explanation": "Secure cookies use HTTPOnly, Secure, and SameSite flags."
            },
            {
                "question_text": "What is content security policy?",
                "options": ["Content filtering", "Prevent XSS attacks", "Content backup", "Content monitoring"],
                "correct_option_index": 1,
                "explanation": "CSP helps prevent XSS and data injection attacks."
            },
            {
                "question_text": "What is parameterized query?",
                "options": ["Dynamic SQL", "Prepared statements", "Encrypted SQL", "Monitored SQL"],
                "correct_option_index": 1,
                "explanation": "Parameterized queries use prepared statements to prevent SQL injection."
            },
            {
                "question_text": "What is file upload security?",
                "options": ["Encrypt uploads", "Validate uploaded files", "Monitor uploads", "Backup uploads"],
                "correct_option_index": 1,
                "explanation": "File upload security validates file types and content."
            },
            {
                "question_text": "What is error handling?",
                "options": ["Show all errors", "Handle errors securely", "Ignore errors", "Log all errors"],
                "correct_option_index": 1,
                "explanation": "Secure error handling prevents information disclosure."
            },
            {
                "question_text": "What is dependency security?",
                "options": ["Secure dependencies", "Update dependencies", "Monitor dependencies", "Backup dependencies"],
                "correct_option_index": 0,
                "explanation": "Dependency security ensures third-party components are secure."
            },
            {
                "question_text": "What is API security?",
                "options": ["Secure API endpoints", "Monitor APIs", "Backup APIs", "Encrypt APIs"],
                "correct_option_index": 0,
                "explanation": "API security protects REST and other API endpoints."
            },
            {
                "question_text": "What is rate limiting?",
                "options": ["Limit request rates", "Encrypt requests", "Monitor requests", "Backup requests"],
                "correct_option_index": 0,
                "explanation": "Rate limiting prevents abuse by limiting request rates."
            },
            {
                "question_text": "What is CORS?",
                "options": ["Cross-origin resource sharing", "Cross-site scripting", "Cross-site request forgery", "Content security"],
                "correct_option_index": 0,
                "explanation": "CORS controls cross-origin resource sharing in web applications."
            },
            {
                "question_text": "What is HTTP basic auth?",
                "options": ["Username/password auth", "Token auth", "Biometric auth", "Multi-factor auth"],
                "correct_option_index": 0,
                "explanation": "HTTP basic auth uses username and password credentials."
            },
            {
                "question_text": "What is JWT?",
                "options": ["JSON Web Token", "JavaScript Web Tool", "Java Web Technology", "JSON Web Transport"],
                "correct_option_index": 0,
                "explanation": "JWT is a compact token format for secure information exchange."
            },
            {
                "question_text": "What is OAuth?",
                "options": ["Authorization framework", "Authentication framework", "Encryption framework", "Monitoring framework"],
                "correct_option_index": 0,
                "explanation": "OAuth is an authorization framework for delegated access."
            },
            {
                "question_text": "What is secure password storage?",
                "options": ["Plain text", "Hashed with salt", "Encrypted", "Base64 encoded"],
                "correct_option_index": 1,
                "explanation": "Secure password storage uses hashing with salt."
            },
            {
                "question_text": "What is two-factor authentication?",
                "options": ["Two passwords", "Password + another factor", "Two usernames", "Two tokens"],
                "correct_option_index": 1,
                "explanation": "2FA requires password plus another authentication factor."
            },
            {
                "question_text": "What is security testing?",
                "options": ["Performance testing", "Find vulnerabilities", "User testing", "Load testing"],
                "correct_option_index": 1,
                "explanation": "Security testing identifies vulnerabilities in applications."
            },
            {
                "question_text": "What is penetration testing?",
                "options": ["Automated testing", "Manual security testing", "User testing", "Performance testing"],
                "correct_option_index": 1,
                "explanation": "Penetration testing manually tests for security weaknesses."
            },
            {
                "question_text": "What is vulnerability scanning?",
                "options": ["Manual testing", "Automated vulnerability detection", "User testing", "Performance testing"],
                "correct_option_index": 1,
                "explanation": "Vulnerability scanning automatically detects security weaknesses."
            },
            {
                "question_text": "What is security logging?",
                "options": ["Log all events", "Log security events", "Log errors only", "Log performance"],
                "correct_option_index": 1,
                "explanation": "Security logging records security-relevant events."
            },
            {
                "question_text": "What is incident response?",
                "options": ["Prevent incidents", "Respond to security incidents", "Monitor incidents", "Backup incidents"],
                "correct_option_index": 1,
                "explanation": "Incident response manages security breaches and attacks."
            }
        ]
    },
    {
        "slug": "malware-analysis-fundamentals",
        "title": "Malware Analysis Fundamentals",
        "description": "Essential concepts for analyzing and understanding malicious software",
        "category": "Malware Analysis",
        "type": "technical",
        "difficulty": "intermediate",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is malware?",
                "options": ["Legitimate software", "Malicious software", "System software", "Application software"],
                "correct_option_index": 1,
                "explanation": "Malware is software designed to harm or exploit computer systems."
            },
            {
                "question_text": "What is a virus?",
                "options": ["Self-replicating program", "Standalone program", "System utility", "Network protocol"],
                "correct_option_index": 0,
                "explanation": "A virus is malicious code that replicates by attaching to legitimate programs."
            },
            {
                "question_text": "What is a Trojan horse?",
                "options": ["Self-replicating malware", "Disguised legitimate program", "Network worm", "System virus"],
                "correct_option_index": 1,
                "explanation": "A Trojan horse disguises itself as legitimate software to trick users."
            },
            {
                "question_text": "What is ransomware?",
                "options": ["Steals data", "Encrypts files for ransom", "Monitors activity", "Deletes files"],
                "correct_option_index": 1,
                "explanation": "Ransomware encrypts files and demands payment for decryption."
            },
            {
                "question_text": "What is spyware?",
                "options": ["Encrypts data", "Steals information", "Deletes files", "Replicates itself"],
                "correct_option_index": 1,
                "explanation": "Spyware secretly collects user information without consent."
            },
            {
                "question_text": "What is a rootkit?",
                "options": ["Antivirus software", "Stealthy malware", "System backup", "Network monitor"],
                "correct_option_index": 1,
                "explanation": "Rootkits hide malicious activity and maintain persistence."
            },
            {
                "question_text": "What is a botnet?",
                "options": ["Single infected computer", "Network of infected computers", "Antivirus network", "Secure network"],
                "correct_option_index": 1,
                "explanation": "A botnet is a network of compromised computers controlled by attackers."
            },
            {
                "question_text": "What is polymorphic malware?",
                "options": ["Static malware", "Self-changing malware", "Network malware", "System malware"],
                "correct_option_index": 1,
                "explanation": "Polymorphic malware changes its code to evade detection."
            },
            {
                "question_text": "What is sandbox analysis?",
                "options": ["Live system analysis", "Isolated environment analysis", "Network analysis", "Memory analysis"],
                "correct_option_index": 1,
                "explanation": "Sandbox analysis runs malware in an isolated environment."
            },
            {
                "question_text": "What is static analysis?",
                "options": ["Running malware", "Analyzing code without execution", "Network monitoring", "Memory dumping"],
                "correct_option_index": 1,
                "explanation": "Static analysis examines malware code without executing it."
            },
            {
                "question_text": "What is dynamic analysis?",
                "options": ["Code review", "Running malware in controlled environment", "File hashing", "String extraction"],
                "correct_option_index": 1,
                "explanation": "Dynamic analysis observes malware behavior during execution."
            },
            {
                "question_text": "What is reverse engineering?",
                "options": ["Forward engineering", "Deconstructing to understand design", "Network engineering", "System engineering"],
                "correct_option_index": 1,
                "explanation": "Reverse engineering analyzes software to understand its functionality."
            },
            {
                "question_text": "What is a packer?",
                "options": ["Unpacking tool", "Software that compresses/encrypts malware", "Network protocol", "File system"],
                "correct_option_index": 1,
                "explanation": "Packers compress and encrypt malware to evade detection."
            },
            {
                "question_text": "What is obfuscation?",
                "options": ["Code clarification", "Making code difficult to understand", "Code optimization", "Code documentation"],
                "correct_option_index": 1,
                "explanation": "Obfuscation makes code intentionally difficult to analyze."
            },
            {
                "question_text": "What is a hash in malware analysis?",
                "options": ["Food hash", "Unique file fingerprint", "Network hash", "Memory hash"],
                "correct_option_index": 1,
                "explanation": "Hash values uniquely identify malware samples."
            },
            {
                "question_text": "What is IOC?",
                "options": ["Input/Output Control", "Indicators of Compromise", "Internet of Computers", "Internal Operations Center"],
                "correct_option_index": 1,
                "explanation": "IOCs are artifacts indicating potential system compromise."
            },
            {
                "question_text": "What is YARA?",
                "options": ["Programming language", "Malware identification tool", "Network protocol", "Database system"],
                "correct_option_index": 1,
                "explanation": "YARA is a tool for identifying and classifying malware samples."
            },
            {
                "question_text": "What is a dropper?",
                "options": ["Antivirus tool", "Program that installs malware", "Network scanner", "System cleaner"],
                "correct_option_index": 1,
                "explanation": "Droppers deliver and install additional malware payloads."
            },
            {
                "question_text": "What is a loader?",
                "options": ["System loader", "Program that loads malware", "Network loader", "File loader"],
                "correct_option_index": 1,
                "explanation": "Loaders execute and install malware in memory."
            },
            {
                "question_text": "What is memory analysis?",
                "options": ["Disk analysis", "RAM analysis for malware artifacts", "Network analysis", "File analysis"],
                "correct_option_index": 1,
                "explanation": "Memory analysis examines RAM for malware artifacts and behavior."
            },
            {
                "question_text": "What is a shellcode?",
                "options": ["Operating system shell", "Small code piece for exploitation", "Network protocol", "File system"],
                "correct_option_index": 1,
                "explanation": "Shellcode is small payload code used in exploitation."
            },
            {
                "question_text": "What is an exploit kit?",
                "options": ["Development kit", "Tool package for creating exploits", "Antivirus kit", "Network kit"],
                "correct_option_index": 1,
                "explanation": "Exploit kits provide tools for creating and delivering exploits."
            },
            {
                "question_text": "What is a C2 server?",
                "options": ["Command and Control server", "Client server", "Cache server", "Compute server"],
                "correct_option_index": 0,
                "explanation": "C2 servers control and communicate with infected systems."
            },
            {
                "question_text": "What is fileless malware?",
                "options": ["Malware without files", "Malware that deletes files", "Malware that creates files", "File-based malware"],
                "correct_option_index": 0,
                "explanation": "Fileless malware operates in memory without creating files."
            },
            {
                "question_text": "What is a heuristic analysis?",
                "options": ["Exact matching", "Behavior-based detection", "Network analysis", "File analysis"],
                "correct_option_index": 1,
                "explanation": "Heuristic analysis identifies suspicious behavior patterns."
            },
            {
                "question_text": "What is a signature?",
                "options": ["Digital signature", "Unique malware pattern", "User signature", "File signature"],
                "correct_option_index": 1,
                "explanation": "Signatures are unique patterns used to identify malware."
            },
            {
                "question_text": "What is a VM escape?",
                "options": ["Virtual machine exit", "Breaking out of virtualized environment", "Network escape", "File escape"],
                "correct_option_index": 1,
                "explanation": "VM escapes break out of virtualized environments to access host systems."
            },
            {
                "question_text": "What is an EDR?",
                "options": ["Event Detection and Response", "Endpoint Detection and Response", "Email Detection and Response", "Enhanced Detection and Response"],
                "correct_option_index": 1,
                "explanation": "EDR systems detect and respond to threats on endpoints."
            },
            {
                "question_text": "What is a honeypot?",
                "options": ["Honey container", "Decoy system to attract attackers", "Network pot", "Security pot"],
                "correct_option_index": 1,
                "explanation": "Honeypots are decoy systems designed to attract and study attackers."
            },
            {
                "question_text": "What is threat hunting?",
                "options": ["Threat creation", "Proactive threat detection", "Threat reporting", "Threat monitoring"],
                "correct_option_index": 1,
                "explanation": "Threat hunting proactively searches for threats in systems."
            },
            {
                "question_text": "What is malware classification?",
                "options": ["File classification", "Categorizing malware by type/family", "Network classification", "User classification"],
                "correct_option_index": 1,
                "explanation": "Malware classification categorizes threats by type and family."
            }
        ]
    },
    {
        "slug": "incident-response-basics",
        "title": "Incident Response Basics",
        "description": "Fundamental concepts for handling security incidents effectively",
        "category": "Incident Response",
        "type": "operational",
        "difficulty": "intermediate",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is incident response?",
                "options": ["Creating incidents", "Managing security breaches", "Monitoring systems", "Reporting incidents"],
                "correct_option_index": 1,
                "explanation": "Incident response manages the aftermath of security breaches."
            },
            {
                "question_text": "What is the first phase of incident response?",
                "options": ["Containment", "Preparation", "Eradication", "Recovery"],
                "correct_option_index": 1,
                "explanation": "Preparation is the first phase, establishing policies and tools."
            },
            {
                "question_text": "What is incident containment?",
                "options": ["Creating incidents", "Limiting damage", "Fixing vulnerabilities", "Reporting incidents"],
                "correct_option_index": 1,
                "explanation": "Containment limits the spread and damage of incidents."
            },
            {
                "question_text": "What is the NIST Incident Response Framework?",
                "options": ["Network framework", "Security incident handling framework", "Development framework", "Testing framework"],
                "correct_option_index": 1,
                "explanation": "NIST provides a structured approach to incident response."
            },
            {
                "question_text": "What is an incident response plan?",
                "options": ["Incident creation plan", "Structured approach to handling incidents", "Network plan", "Recovery plan"],
                "correct_option_index": 1,
                "explanation": "An IR plan outlines procedures for handling security incidents."
            },
            {
                "question_text": "What is incident triage?",
                "options": ["Incident creation", "Prioritizing incidents", "Incident reporting", "Incident documentation"],
                "correct_option_index": 1,
                "explanation": "Triage prioritizes incidents based on severity and impact."
            },
            {
                "question_text": "What is an incident response team?",
                "options": ["Team that creates incidents", "Team handling security incidents", "Network team", "Development team"],
                "correct_option_index": 1,
                "explanation": "IRT is responsible for managing security incidents."
            },
            {
                "question_text": "What is incident eradication?",
                "options": ["Creating incidents", "Removing threat causes", "Containing incidents", "Recovering systems"],
                "correct_option_index": 1,
                "explanation": "Eradication eliminates the root cause of incidents."
            },
            {
                "question_text": "What is incident recovery?",
                "options": ["Creating incidents", "Restoring normal operations", "Containing incidents", "Documenting incidents"],
                "correct_option_index": 1,
                "explanation": "Recovery restores systems to normal operations."
            },
            {
                "question_text": "What is post-incident review?",
                "options": ["Creating new incidents", "Analyzing incident response effectiveness", "Network review", "System review"],
                "correct_option_index": 1,
                "explanation": "Post-incident reviews evaluate response effectiveness and lessons learned."
            },
            {
                "question_text": "What is incident classification?",
                "options": ["Creating incident types", "Categorizing incidents by type/impact", "Documenting incidents", "Reporting incidents"],
                "correct_option_index": 1,
                "explanation": "Classification categorizes incidents for proper handling."
            },
            {
                "question_text": "What is a security incident?",
                "options": ["Routine event", "Security breach or policy violation", "Network event", "System event"],
                "correct_option_index": 1,
                "explanation": "Security incidents involve breaches or policy violations."
            },
            {
                "question_text": "What is incident escalation?",
                "options": ["Creating incidents", "Raising incident priority/level", "Closing incidents", "Documenting incidents"],
                "correct_option_index": 1,
                "explanation": "Escalation increases incident priority or involves higher authorities."
            },
            {
                "question_text": "What is incident communication?",
                "options": ["Network communication", "Informing stakeholders about incidents", "System communication", "User communication"],
                "correct_option_index": 1,
                "explanation": "Incident communication keeps stakeholders informed."
            },
            {
                "question_text": "What is an incident timeline?",
                "options": ["Project timeline", "Chronological record of incident events", "Network timeline", "System timeline"],
                "correct_option_index": 1,
                "explanation": "Timeline documents the chronological events of an incident."
            },
            {
                "question_text": "What is evidence preservation?",
                "options": ["Creating evidence", "Maintaining incident evidence integrity", "Deleting evidence", "Sharing evidence"],
                "correct_option_index": 1,
                "explanation": "Evidence preservation maintains integrity for investigation."
            },
            {
                "question_text": "What is incident coordination?",
                "options": ["Creating incidents", "Managing multiple teams during response", "Network coordination", "System coordination"],
                "correct_option_index": 1,
                "explanation": "Coordination manages multiple teams and resources."
            },
            {
                "question_text": "What is incident severity?",
                "options": ["Incident count", "Impact level of incident", "Incident time", "Incident location"],
                "correct_option_index": 1,
                "explanation": "Severity indicates the impact and urgency of incidents."
            },
            {
                "question_text": "What is incident scope?",
                "options": ["Incident time", "Affected systems and data", "Incident location", "Incident type"],
                "correct_option_index": 1,
                "explanation": "Scope defines the extent of affected systems and data."
            },
            {
                "question_text": "What is root cause analysis?",
                "options": ["Surface analysis", "Finding fundamental cause of incidents", "Network analysis", "System analysis"],
                "correct_option_index": 1,
                "explanation": "Root cause analysis identifies the fundamental cause of incidents."
            },
            {
                "question_text": "What is incident containment strategy?",
                "options": ["Incident creation", "Approach to limit incident spread", "Incident reporting", "Incident recovery"],
                "correct_option_index": 1,
                "explanation": "Containment strategies limit incident damage and spread."
            },
            {
                "question_text": "What is an incident handler?",
                "options": ["Incident creator", "Person managing security incidents", "Network handler", "System handler"],
                "correct_option_index": 1,
                "explanation": "Incident handlers manage and coordinate response activities."
            },
            {
                "question_text": "What is incident detection?",
                "options": ["Creating incidents", "Identifying security incidents", "Documenting incidents", "Reporting incidents"],
                "correct_option_index": 1,
                "explanation": "Detection identifies potential security incidents."
            },
            {
                "question_text": "What is incident analysis?",
                "options": ["Creating incidents", "Examining incident details and impact", "Network analysis", "System analysis"],
                "correct_option_index": 1,
                "explanation": "Analysis examines incident details and determines impact."
            },
            {
                "question_text": "What is incident documentation?",
                "options": ["Creating documents", "Recording incident details and actions", "Network documentation", "System documentation"],
                "correct_option_index": 1,
                "explanation": "Documentation records all incident details and response actions."
            },
            {
                "question_text": "What is incident metrics?",
                "options": ["Network measurements", "Incident response performance measures", "System metrics", "User metrics"],
                "correct_option_index": 1,
                "explanation": "Metrics measure incident response effectiveness and performance."
            },
            {
                "question_text": "What is incident forensics?",
                "options": ["Creating incidents", "Technical investigation of incidents", "Network forensics", "System forensics"],
                "correct_option_index": 1,
                "explanation": "Forensics involves technical investigation of security incidents."
            },
            {
                "question_text": "What is incident automation?",
                "options": ["Creating incidents", "Using tools to automate response tasks", "Network automation", "System automation"],
                "correct_option_index": 1,
                "explanation": "Automation uses tools to streamline and accelerate response."
            },
            {
                "question_text": "What is incident attribution?",
                "options": ["Creating incidents", "Identifying threat actors behind incidents", "Network attribution", "System attribution"],
                "correct_option_index": 1,
                "explanation": "Attribution identifies the threat actors responsible."
            },
            {
                "question_text": "What is incident remediation?",
                "options": ["Creating incidents", "Fixing vulnerabilities and issues", "Network remediation", "System remediation"],
                "correct_option_index": 1,
                "explanation": "Remediation fixes vulnerabilities and addresses root causes."
            },
            {
                "question_text": "What is incident validation?",
                "options": ["Creating incidents", "Verifying incident resolution", "Network validation", "System validation"],
                "correct_option_index": 1,
                "explanation": "Validation confirms that incidents are fully resolved."
            },
            {
                "question_text": "What is incident reporting?",
                "options": ["Creating incidents", "Documenting and communicating incident status", "Network reporting", "System reporting"],
                "correct_option_index": 1,
                "explanation": "Reporting documents and communicates incident status to stakeholders."
            }
        ]
    },
    {
        "slug": "cryptography-essentials",
        "title": "Cryptography Essentials",
        "description": "Fundamental concepts of encryption and cryptographic security",
        "category": "Cryptography",
        "type": "technical",
        "difficulty": "intermediate",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is cryptography?",
                "options": ["Study of hidden writing", "Study of networks", "Study of systems", "Study of protocols"],
                "correct_option_index": 0,
                "explanation": "Cryptography is the practice of secure communication in the presence of adversaries."
            },
            {
                "question_text": "What is encryption?",
                "options": ["Making data public", "Scrambling data to protect it", "Deleting data", "Compressing data"],
                "correct_option_index": 1,
                "explanation": "Encryption converts plaintext into ciphertext to protect confidentiality."
            },
            {
                "question_text": "What is decryption?",
                "options": ["Making data secret", "Restoring encrypted data", "Deleting encrypted data", "Compressing encrypted data"],
                "correct_option_index": 1,
                "explanation": "Decryption converts ciphertext back to readable plaintext."
            },
            {
                "question_text": "What is a cryptographic key?",
                "options": ["Physical key", "Secret value for encryption/decryption", "Network key", "System key"],
                "correct_option_index": 1,
                "explanation": "A key is a secret value used in cryptographic algorithms."
            },
            {
                "question_text": "What is symmetric encryption?",
                "options": ["Different keys for encryption/decryption", "Same key for encryption and decryption", "No keys needed", "Multiple keys"],
                "correct_option_index": 1,
                "explanation": "Symmetric encryption uses the same key for both encryption and decryption."
            },
            {
                "question_text": "What is asymmetric encryption?",
                "options": ["Same key for encryption/decryption", "Different keys for encryption and decryption", "No keys needed", "Single key"],
                "correct_option_index": 1,
                "explanation": "Asymmetric encryption uses different keys for encryption and decryption."
            },
            {
                "question_text": "What is a public key?",
                "options": ["Secret key", "Shared encryption key", "Key for encryption/verification", "Key for decryption"],
                "correct_option_index": 2,
                "explanation": "Public keys are used for encryption and signature verification."
            },
            {
                "question_text": "What is a private key?",
                "options": ["Shared key", "Public key", "Secret key for decryption/signing", "Network key"],
                "correct_option_index": 2,
                "explanation": "Private keys are kept secret and used for decryption and signing."
            },
            {
                "question_text": "What is a digital signature?",
                "options": ["Handwritten signature", "Cryptographic authentication", "Email signature", "File signature"],
                "correct_option_index": 1,
                "explanation": "Digital signatures authenticate and verify message integrity."
            },
            {
                "question_text": "What is a hash function?",
                "options": ["Encryption function", "One-way function producing fixed-size output", "Network function", "System function"],
                "correct_option_index": 1,
                "explanation": "Hash functions produce fixed-size outputs from variable inputs."
            },
            {
                "question_text": "What is a digital certificate?",
                "options": ["Paper certificate", "Document binding public key to identity", "Network certificate", "System certificate"],
                "correct_option_index": 1,
                "explanation": "Certificates bind public keys to verified identities."
            },
            {
                "question_text": "What is a Certificate Authority (CA)?",
                "options": ["Network authority", "Entity issuing digital certificates", "System authority", "User authority"],
                "correct_option_index": 1,
                "explanation": "CAs issue and manage digital certificates."
            },
            {
                "question_text": "What is SSL/TLS?",
                "options": ["Network protocol", "Secure communication protocol", "System protocol", "Email protocol"],
                "correct_option_index": 1,
                "explanation": "SSL/TLS provide secure communication over networks."
            },
            {
                "question_text": "What is a cryptographic algorithm?",
                "options": ["Network algorithm", "Mathematical procedure for encryption", "System algorithm", "User algorithm"],
                "correct_option_index": 1,
                "explanation": "Cryptographic algorithms perform encryption and decryption operations."
            },
            {
                "question_text": "What is a block cipher?",
                "options": ["Network cipher", "Encrypts data in fixed-size blocks", "Stream cipher", "System cipher"],
                "correct_option_index": 1,
                "explanation": "Block ciphers encrypt data in fixed-size blocks."
            },
            {
                "question_text": "What is a stream cipher?",
                "options": ["Block cipher", "Encrypts data one bit/byte at a time", "Network cipher", "System cipher"],
                "correct_option_index": 1,
                "explanation": "Stream ciphers encrypt data sequentially."
            },
            {
                "question_text": "What is AES?",
                "options": ["Network standard", "Advanced Encryption Standard", "System standard", "Email standard"],
                "correct_option_index": 1,
                "explanation": "AES is a widely used symmetric encryption standard."
            },
            {
                "question_text": "What is RSA?",
                "options": ["Network algorithm", "Asymmetric encryption algorithm", "System algorithm", "Email algorithm"],
                "correct_option_index": 1,
                "explanation": "RSA is a widely used asymmetric encryption algorithm."
            },
            {
                "question_text": "What is key management?",
                "options": ["Network management", "Managing cryptographic keys", "System management", "User management"],
                "correct_option_index": 1,
                "explanation": "Key management handles the lifecycle of cryptographic keys."
            },
            {
                "question_text": "What is key exchange?",
                "options": ["Network exchange", "Securely sharing cryptographic keys", "System exchange", "User exchange"],
                "correct_option_index": 1,
                "explanation": "Key exchange protocols securely share cryptographic keys."
            },
            {
                "question_text": "What is perfect forward secrecy?",
                "options": ["Network secrecy", "Compromise of long-term keys doesn't compromise past sessions", "System secrecy", "User secrecy"],
                "correct_option_index": 1,
                "explanation": "PFS ensures past sessions remain secure even if keys are compromised."
            },
            {
                "question_text": "What is a cryptographic nonce?",
                "options": ["Network nonce", "Number used once in cryptography", "System nonce", "User nonce"],
                "correct_option_index": 1,
                "explanation": "Nonces are random values used once to prevent replay attacks."
            },
            {
                "question_text": "What is a salt?",
                "options": ["Network salt", "Random data added to passwords before hashing", "System salt", "User salt"],
                "correct_option_index": 1,
                "explanation": "Salts add randomness to password hashing to prevent rainbow table attacks."
            },
            {
                "question_text": "What is a cryptographic hash?",
                "options": ["Network hash", "One-way hash function for data integrity", "System hash", "User hash"],
                "correct_option_index": 1,
                "explanation": "Cryptographic hashes verify data integrity and authenticity."
            },
            {
                "question_text": "What is message authentication?",
                "options": ["Network authentication", "Verifying message origin and integrity", "System authentication", "User authentication"],
                "correct_option_index": 1,
                "explanation": "Message authentication verifies who sent a message and that it wasn't altered."
            },
            {
                "question_text": "What is a key derivation function?",
                "options": ["Network function", "Deriving cryptographic keys from passwords", "System function", "User function"],
                "correct_option_index": 1,
                "explanation": "KDFs derive cryptographic keys from passwords or other secrets."
            },
            {
                "question_text": "What is quantum cryptography?",
                "options": ["Network cryptography", "Cryptography using quantum mechanics", "System cryptography", "User cryptography"],
                "correct_option_index": 1,
                "explanation": "Quantum cryptography uses quantum mechanical principles."
            },
            {
                "question_text": "What is post-quantum cryptography?",
                "options": ["Network cryptography", "Cryptography resistant to quantum computers", "System cryptography", "User cryptography"],
                "correct_option_index": 1,
                "explanation": "Post-quantum cryptography resists attacks by quantum computers."
            },
            {
                "question_text": "What is a side-channel attack?",
                "options": ["Network attack", "Attack exploiting implementation characteristics", "System attack", "User attack"],
                "correct_option_index": 1,
                "explanation": "Side-channel attacks exploit physical implementation characteristics."
            },
            {
                "question_text": "What is cryptanalysis?",
                "options": ["Network analysis", "Breaking cryptographic systems", "System analysis", "User analysis"],
                "correct_option_index": 1,
                "explanation": "Cryptanalysis attempts to break or weaken cryptographic systems."
            },
            {
                "question_text": "What is a man-in-the-middle attack?",
                "options": ["Network attack", "Intercepting and altering communications", "System attack", "User attack"],
                "correct_option_index": 1,
                "explanation": "MITM attacks intercept and potentially alter communications."
            },
            {
                "question_text": "What is a replay attack?",
                "options": ["Network attack", "Reusing valid data to gain unauthorized access", "System attack", "User attack"],
                "correct_option_index": 1,
                "explanation": "Replay attacks reuse valid data to impersonate legitimate users."
            },
            {
                "question_text": "What is cryptographic randomness?",
                "options": ["Network randomness", "Unpredictable random numbers for cryptography", "System randomness", "User randomness"],
                "correct_option_index": 1,
                "explanation": "Cryptographic randomness provides unpredictable values for security."
            }
        ]
    },
    {
        "slug": "cloud-security-fundamentals",
        "title": "Cloud Security Fundamentals",
        "description": "Essential concepts for securing cloud environments and services",
        "category": "Cloud Security",
        "type": "technical",
        "difficulty": "intermediate",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is cloud security?",
                "options": ["Weather security", "Protecting cloud computing environments", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Cloud security protects data, applications, and infrastructure in cloud environments."
            },
            {
                "question_text": "What is IaaS?",
                "options": ["Infrastructure as a Service", "Software as a Service", "Platform as a Service", "Network as a Service"],
                "correct_option_index": 0,
                "explanation": "IaaS provides virtualized computing resources over the internet."
            },
            {
                "question_text": "What is PaaS?",
                "options": ["Platform as a Service", "Infrastructure as a Service", "Software as a Service", "Network as a Service"],
                "correct_option_index": 0,
                "explanation": "PaaS provides platforms for developing and deploying applications."
            },
            {
                "question_text": "What is SaaS?",
                "options": ["Software as a Service", "Platform as a Service", "Infrastructure as a Service", "Network as a Service"],
                "correct_option_index": 0,
                "explanation": "SaaS provides software applications over the internet."
            },
            {
                "question_text": "What is shared responsibility model?",
                "options": ["User handles everything", "Provider handles everything", "Security responsibilities split between provider and user", "Network handles everything"],
                "correct_option_index": 2,
                "explanation": "Shared responsibility divides security tasks between cloud provider and customer."
            },
            {
                "question_text": "What is cloud IAM?",
                "options": ["Cloud Identity and Access Management", "Cloud Infrastructure as a Service", "Cloud Software as a Service", "Cloud Platform as a Service"],
                "correct_option_index": 0,
                "explanation": "Cloud IAM manages user access and permissions in cloud environments."
            },
            {
                "question_text": "What is a security group?",
                "options": ["User group", "Virtual firewall for cloud resources", "Network group", "System group"],
                "correct_option_index": 1,
                "explanation": "Security groups control inbound and outbound traffic to cloud resources."
            },
            {
                "question_text": "What is cloud monitoring?",
                "options": ["Weather monitoring", "Observing cloud infrastructure and applications", "Network monitoring", "System monitoring"],
                "correct_option_index": 1,
                "explanation": "Cloud monitoring tracks performance and security of cloud resources."
            },
            {
                "question_text": "What is cloud compliance?",
                "options": ["Following cloud regulations", "Network compliance", "System compliance", "User compliance"],
                "correct_option_index": 0,
                "explanation": "Cloud compliance ensures adherence to regulations and standards."
            },
            {
                "question_text": "What is a VPC?",
                "options": ["Virtual Private Cloud", "Virtual Public Cloud", "Very Personal Computer", "Virtual Private Computer"],
                "correct_option_index": 0,
                "explanation": "VPC provides isolated network resources in the cloud."
            },
            {
                "question_text": "What is cloud encryption?",
                "options": ["Weather encryption", "Encrypting data in cloud environments", "Network encryption", "System encryption"],
                "correct_option_index": 1,
                "explanation": "Cloud encryption protects data stored and transmitted in cloud environments."
            },
            {
                "question_text": "What is cloud backup?",
                "options": ["Weather backup", "Copying data to cloud storage", "Network backup", "System backup"],
                "correct_option_index": 1,
                "explanation": "Cloud backup stores copies of data in cloud environments."
            },
            {
                "question_text": "What is multi-cloud?",
                "options": ["Multiple weather clouds", "Using multiple cloud providers", "Single cloud provider", "No cloud provider"],
                "correct_option_index": 1,
                "explanation": "Multi-cloud strategies use services from multiple cloud providers."
            },
            {
                "question_text": "What is hybrid cloud?",
                "options": ["Weather hybrid", "Combination of public and private cloud", "Only public cloud", "Only private cloud"],
                "correct_option_index": 1,
                "explanation": "Hybrid cloud combines on-premises infrastructure with public cloud."
            },
            {
                "question_text": "What is cloud access security broker (CASB)?",
                "options": ["Cloud access broker", "Security tool for cloud applications", "Network broker", "System broker"],
                "correct_option_index": 1,
                "explanation": "CASBs provide security and compliance for cloud applications."
            },
            {
                "question_text": "What is cloud security posture management (CSPM)?",
                "options": ["Cloud posture management", "Tool for identifying cloud misconfigurations", "Network management", "System management"],
                "correct_option_index": 1,
                "explanation": "CSPMs identify and remediate cloud security misconfigurations."
            },
            {
                "question_text": "What is a cloud security alliance (CSA)?",
                "options": ["Cloud security organization", "Weather alliance", "Network alliance", "System alliance"],
                "correct_option_index": 0,
                "explanation": "CSA is an organization that promotes cloud security best practices."
            },
            {
                "question_text": "What is cloud DLP?",
                "options": ["Cloud data loss prevention", "Weather data protection", "Network data protection", "System data protection"],
                "correct_option_index": 0,
                "explanation": "Cloud DLP prevents unauthorized data exfiltration from cloud environments."
            },
            {
                "question_text": "What is cloud SIEM?",
                "options": ["Cloud security information management", "Weather information management", "Network information management", "System information management"],
                "correct_option_index": 0,
                "explanation": "Cloud SIEM aggregates and analyzes security logs from cloud sources."
            },
            {
                "question_text": "What is cloud WAF?",
                "options": ["Cloud web application firewall", "Weather application firewall", "Network application firewall", "System application firewall"],
                "correct_option_index": 0,
                "explanation": "Cloud WAFs protect web applications hosted in cloud environments."
            },
            {
                "question_text": "What is container security?",
                "options": ["Container physical security", "Securing containerized applications", "Network container security", "System container security"],
                "correct_option_index": 1,
                "explanation": "Container security protects applications running in containers."
            },
            {
                "question_text": "What is serverless security?",
                "options": ["Server physical security", "Securing serverless computing environments", "Network server security", "System server security"],
                "correct_option_index": 1,
                "explanation": "Serverless security protects applications running on serverless platforms."
            },
            {
                "question_text": "What is cloud identity federation?",
                "options": ["Cloud identity management", "Sharing identities across cloud providers", "Network identity", "System identity"],
                "correct_option_index": 1,
                "explanation": "Identity federation allows single sign-on across cloud services."
            },
            {
                "question_text": "What is cloud network security?",
                "options": ["Weather network security", "Securing cloud network infrastructure", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Cloud network security protects virtual networks and traffic."
            },
            {
                "question_text": "What is cloud storage security?",
                "options": ["Weather storage security", "Securing data stored in cloud environments", "Network storage security", "System storage security"],
                "correct_option_index": 1,
                "explanation": "Cloud storage security protects data stored in cloud storage services."
            },
            {
                "question_text": "What is cloud threat detection?",
                "options": ["Weather threat detection", "Identifying threats in cloud environments", "Network threat detection", "System threat detection"],
                "correct_option_index": 1,
                "explanation": "Cloud threat detection identifies security threats in cloud infrastructure."
            },
            {
                "question_text": "What is cloud vulnerability management?",
                "options": ["Weather vulnerability management", "Managing vulnerabilities in cloud systems", "Network vulnerability management", "System vulnerability management"],
                "correct_option_index": 1,
                "explanation": "Cloud vulnerability management identifies and fixes cloud security vulnerabilities."
            },
            {
                "question_text": "What is cloud incident response?",
                "options": ["Weather incident response", "Responding to security incidents in cloud", "Network incident response", "System incident response"],
                "correct_option_index": 1,
                "explanation": "Cloud incident response manages security breaches in cloud environments."
            },
            {
                "question_text": "What is cloud disaster recovery?",
                "options": ["Weather disaster recovery", "Recovering cloud infrastructure after disasters", "Network disaster recovery", "System disaster recovery"],
                "correct_option_index": 1,
                "explanation": "Cloud disaster recovery restores cloud services after disruptions."
            },
            {
                "question_text": "What is cloud security automation?",
                "options": ["Weather automation", "Automating cloud security tasks", "Network automation", "System automation"],
                "correct_option_index": 1,
                "explanation": "Cloud security automation streamlines security operations in cloud environments."
            },
            {
                "question_text": "What is cloud security analytics?",
                "options": ["Weather analytics", "Analyzing security data in cloud environments", "Network analytics", "System analytics"],
                "correct_option_index": 1,
                "explanation": "Cloud security analytics analyzes security data from cloud sources."
            },
            {
                "question_text": "What is cloud security orchestration?",
                "options": ["Weather orchestration", "Coordinating cloud security tools and processes", "Network orchestration", "System orchestration"],
                "correct_option_index": 1,
                "explanation": "Cloud security orchestration coordinates multiple security tools and responses."
            },
            {
                "question_text": "What is cloud security compliance?",
                "options": ["Weather compliance", "Ensuring cloud resources meet regulatory requirements", "Network compliance", "System compliance"],
                "correct_option_index": 1,
                "explanation": "Cloud security compliance ensures adherence to regulations and standards."
            },
            {
                "question_text": "What is cloud security training?",
                "options": ["Weather training", "Educating users on cloud security best practices", "Network training", "System training"],
                "correct_option_index": 1,
                "explanation": "Cloud security training educates users on secure cloud practices."
            },
            {
                "question_text": "What is cloud security governance?",
                "options": ["Weather governance", "Managing cloud security policies and procedures", "Network governance", "System governance"],
                "correct_option_index": 1,
                "explanation": "Cloud security governance establishes policies and procedures for cloud security."
            }
        ]
    },
    {
        "slug": "mobile-security-basics",
        "title": "Mobile Security Basics",
        "description": "Essential concepts for securing mobile devices and applications",
        "category": "Mobile Security",
        "type": "technical",
        "difficulty": "beginner",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is mobile security?",
                "options": ["Phone protection", "Protecting mobile devices and data", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Mobile security protects smartphones, tablets, and mobile applications."
            },
            {
                "question_text": "What is MDM?",
                "options": ["Mobile Device Management", "Mobile Data Management", "Mobile Development Management", "Mobile Display Management"],
                "correct_option_index": 0,
                "explanation": "MDM manages and secures mobile devices in organizations."
            },
            {
                "question_text": "What is mobile malware?",
                "options": ["Desktop malware", "Malicious software targeting mobile devices", "Network malware", "System malware"],
                "correct_option_index": 1,
                "explanation": "Mobile malware specifically targets smartphones and tablets."
            },
            {
                "question_text": "What is mobile phishing?",
                "options": ["Network phishing", "Phishing attacks targeting mobile users", "System phishing", "Desktop phishing"],
                "correct_option_index": 1,
                "explanation": "Mobile phishing attacks target users on mobile devices."
            },
            {
                "question_text": "What is app sandboxing?",
                "options": ["Play area for apps", "Isolating applications for security", "Network sandbox", "System sandbox"],
                "correct_option_index": 1,
                "explanation": "Sandboxing isolates apps to prevent them from accessing other apps or system data."
            },
            {
                "question_text": "What is mobile encryption?",
                "options": ["Phone encryption", "Encrypting data on mobile devices", "Network encryption", "System encryption"],
                "correct_option_index": 1,
                "explanation": "Mobile encryption protects data stored on smartphones and tablets."
            },
            {
                "question_text": "What is BYOD?",
                "options": ["Bring Your Own Device", "Buy Your Own Device", "Build Your Own Device", "Borrow Your Own Device"],
                "correct_option_index": 0,
                "explanation": "BYOD allows employees to use personal devices for work."
            },
            {
                "question_text": "What is mobile device security?",
                "options": ["Phone physical security", "Comprehensive protection of mobile devices", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Mobile device security includes physical, network, and application protection."
            },
            {
                "question_text": "What is a mobile VPN?",
                "options": ["Phone VPN", "Virtual Private Network for mobile devices", "Network VPN", "System VPN"],
                "correct_option_index": 1,
                "explanation": "Mobile VPNs provide secure connections for smartphones and tablets."
            },
            {
                "question_text": "What is mobile app security?",
                "options": ["Phone app security", "Securing mobile applications", "Network app security", "System app security"],
                "correct_option_index": 1,
                "explanation": "Mobile app security protects applications from vulnerabilities."
            },
            {
                "question_text": "What is jailbreaking?",
                "options": ["Breaking out of jail", "Removing iOS restrictions", "Network breaking", "System breaking"],
                "correct_option_index": 1,
                "explanation": "Jailbreaking removes iOS security restrictions."
            },
            {
                "question_text": "What is rooting?",
                "options": ["Plant roots", "Gaining root access on Android", "Network rooting", "System rooting"],
                "correct_option_index": 1,
                "explanation": "Rooting gains administrative access on Android devices."
            },
            {
                "question_text": "What is mobile threat detection?",
                "options": ["Phone threat detection", "Identifying threats to mobile devices", "Network threat detection", "System threat detection"],
                "correct_option_index": 1,
                "explanation": "Mobile threat detection identifies and blocks threats to mobile devices."
            },
            {
                "question_text": "What is mobile data loss prevention?",
                "options": ["Phone data protection", "Preventing data exfiltration from mobile devices", "Network data protection", "System data protection"],
                "correct_option_index": 1,
                "explanation": "Mobile DLP prevents unauthorized data transfer from mobile devices."
            },
            {
                "question_text": "What is mobile security policy?",
                "options": ["Phone policy", "Rules for mobile device usage and security", "Network policy", "System policy"],
                "correct_option_index": 1,
                "explanation": "Mobile security policies define rules for secure mobile device usage."
            },
            {
                "question_text": "What is mobile app vetting?",
                "options": ["Phone app checking", "Reviewing mobile applications for security", "Network app checking", "System app checking"],
                "correct_option_index": 1,
                "explanation": "App vetting reviews mobile applications for security issues."
            },
            {
                "question_text": "What is mobile security awareness?",
                "options": ["Phone awareness", "Educating users about mobile security", "Network awareness", "System awareness"],
                "correct_option_index": 1,
                "explanation": "Mobile security awareness educates users about mobile threats."
            },
            {
                "question_text": "What is mobile device backup?",
                "options": ["Phone backup", "Backing up mobile device data", "Network backup", "System backup"],
                "correct_option_index": 1,
                "explanation": "Mobile backup protects data by creating copies."
            },
            {
                "question_text": "What is mobile remote wipe?",
                "options": ["Phone cleaning", "Remotely erasing mobile device data", "Network wipe", "System wipe"],
                "correct_option_index": 1,
                "explanation": "Remote wipe erases data from lost or stolen mobile devices."
            },
            {
                "question_text": "What is mobile security monitoring?",
                "options": ["Phone monitoring", "Monitoring mobile device security", "Network monitoring", "System monitoring"],
                "correct_option_index": 1,
                "explanation": "Mobile security monitoring tracks threats to mobile devices."
            },
            {
                "question_text": "What is mobile containerization?",
                "options": ["Phone container", "Isolating work data on mobile devices", "Network container", "System container"],
                "correct_option_index": 1,
                "explanation": "Containerization separates work and personal data on mobile devices."
            },
            {
                "question_text": "What is mobile biometric security?",
                "options": ["Phone biometrics", "Using biometrics for mobile authentication", "Network biometrics", "System biometrics"],
                "correct_option_index": 1,
                "explanation": "Mobile biometrics use fingerprints or facial recognition for authentication."
            },
            {
                "question_text": "What is mobile network security?",
                "options": ["Phone network security", "Securing mobile network connections", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Mobile network security protects cellular and Wi-Fi connections."
            },
            {
                "question_text": "What is mobile security testing?",
                "options": ["Phone testing", "Testing mobile applications for vulnerabilities", "Network testing", "System testing"],
                "correct_option_index": 1,
                "explanation": "Mobile security testing finds vulnerabilities in mobile apps."
            },
            {
                "question_text": "What is mobile security compliance?",
                "options": ["Phone compliance", "Ensuring mobile security meets regulations", "Network compliance", "System compliance"],
                "correct_option_index": 1,
                "explanation": "Mobile security compliance ensures adherence to regulations."
            },
            {
                "question_text": "What is mobile security governance?",
                "options": ["Phone governance", "Managing mobile security policies", "Network governance", "System governance"],
                "correct_option_index": 1,
                "explanation": "Mobile security governance establishes policies and procedures."
            },
            {
                "question_text": "What is mobile security training?",
                "options": ["Phone training", "Educating users on mobile security", "Network training", "System training"],
                "correct_option_index": 1,
                "explanation": "Mobile security training educates users about secure mobile practices."
            },
            {
                "question_text": "What is mobile security risk assessment?",
                "options": ["Phone risk assessment", "Evaluating mobile security risks", "Network risk assessment", "System risk assessment"],
                "correct_option_index": 1,
                "explanation": "Mobile risk assessment identifies and evaluates mobile security threats."
            },
            {
                "question_text": "What is mobile security incident response?",
                "options": ["Phone incident response", "Responding to mobile security incidents", "Network incident response", "System incident response"],
                "correct_option_index": 1,
                "explanation": "Mobile incident response manages security breaches on mobile devices."
            },
            {
                "question_text": "What is mobile security analytics?",
                "options": ["Phone analytics", "Analyzing mobile security data", "Network analytics", "System analytics"],
                "correct_option_index": 1,
                "explanation": "Mobile security analytics analyzes threats and incidents."
            },
            {
                "question_text": "What is mobile security automation?",
                "options": ["Phone automation", "Automating mobile security tasks", "Network automation", "System automation"],
                "correct_option_index": 1,
                "explanation": "Mobile security automation streamlines security operations."
            },
            {
                "question_text": "What is mobile security orchestration?",
                "options": ["Phone orchestration", "Coordinating mobile security tools", "Network orchestration", "System orchestration"],
                "correct_option_index": 1,
                "explanation": "Mobile security orchestration coordinates multiple security tools."
            },
            {
                "question_text": "What is mobile security architecture?",
                "options": ["Phone architecture", "Designing secure mobile systems", "Network architecture", "System architecture"],
                "correct_option_index": 1,
                "explanation": "Mobile security architecture designs secure mobile solutions."
            },
            {
                "question_text": "What is mobile security best practices?",
                "options": ["Phone practices", "Recommended mobile security measures", "Network practices", "System practices"],
                "correct_option_index": 1,
                "explanation": "Mobile security best practices provide guidelines for secure mobile usage."
            },
            {
                "question_text": "What is mobile security standards?",
                "options": ["Phone standards", "Mobile security regulations and guidelines", "Network standards", "System standards"],
                "correct_option_index": 1,
                "explanation": "Mobile security standards provide frameworks for mobile security."
            }
        ]
    },
    {
        "slug": "data-protection-fundamentals",
        "title": "Data Protection Fundamentals",
        "description": "Essential concepts for protecting sensitive data and privacy",
        "category": "Data Protection",
        "type": "compliance",
        "difficulty": "intermediate",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is data protection?",
                "options": ["Physical data protection", "Safeguarding sensitive information", "Network protection", "System protection"],
                "correct_option_index": 1,
                "explanation": "Data protection safeguards sensitive information from unauthorized access."
            },
            {
                "question_text": "What is GDPR?",
                "options": ["General Data Protection Regulation", "Global Data Protection", "General Data Privacy", "Global Data Privacy"],
                "correct_option_index": 0,
                "explanation": "GDPR is EU regulation protecting personal data and privacy."
            },
            {
                "question_text": "What is personal data?",
                "options": ["Company data", "Information relating to individuals", "Network data", "System data"],
                "correct_option_index": 1,
                "explanation": "Personal data is any information relating to an identified person."
            },
            {
                "question_text": "What is data classification?",
                "options": ["Data organization", "Categorizing data by sensitivity", "Network classification", "System classification"],
                "correct_option_index": 1,
                "explanation": "Data classification categorizes information by sensitivity level."
            },
            {
                "question_text": "What is data encryption?",
                "options": ["Data compression", "Scrambling data to protect confidentiality", "Data deletion", "Data backup"],
                "correct_option_index": 1,
                "explanation": "Data encryption protects information by converting it to unreadable format."
            },
            {
                "question_text": "What is data loss prevention (DLP)?",
                "options": ["Data backup", "Preventing unauthorized data exfiltration", "Data deletion", "Data compression"],
                "correct_option_index": 1,
                "explanation": "DLP prevents unauthorized transfer of sensitive data."
            },
            {
                "question_text": "What is data minimization?",
                "options": ["Data compression", "Collecting only necessary data", "Data deletion", "Data backup"],
                "correct_option_index": 1,
                "explanation": "Data minimization collects only data necessary for specified purposes."
            },
            {
                "question_text": "What is data retention?",
                "options": ["Data backup", "Keeping data for specified periods", "Data deletion", "Data compression"],
                "correct_option_index": 1,
                "explanation": "Data retention defines how long data should be kept."
            },
            {
                "question_text": "What is data privacy?",
                "options": ["Data hiding", "Controlling access to personal information", "Data deletion", "Data backup"],
                "correct_option_index": 1,
                "explanation": "Data privacy controls access to and use of personal information."
            },
            {
                "question_text": "What is consent management?",
                "options": ["User management", "Managing user consent for data processing", "Network management", "System management"],
                "correct_option_index": 1,
                "explanation": "Consent management tracks and manages user permissions."
            },
            {
                "question_text": "What is data breach?",
                "options": ["Data backup failure", "Unauthorized access to sensitive data", "Network breach", "System breach"],
                "correct_option_index": 1,
                "explanation": "Data breach involves unauthorized access to sensitive information."
            },
            {
                "question_text": "What is data masking?",
                "options": ["Data hiding", "Obscuring sensitive data for protection", "Data deletion", "Data backup"],
                "correct_option_index": 1,
                "explanation": "Data masking hides sensitive data while maintaining format."
            },
            {
                "question_text": "What is data anonymization?",
                "options": ["Data naming", "Removing personal identifiers from data", "Data deletion", "Data backup"],
                "correct_option_index": 1,
                "explanation": "Anonymization removes personal identifiers to protect privacy."
            },
            {
                "question_text": "What is data governance?",
                "options": ["Data control", "Managing data availability and quality", "Network governance", "System governance"],
                "correct_option_index": 1,
                "explanation": "Data governance manages data availability, usability, and security."
            },
            {
                "question_text": "What is data lifecycle management?",
                "options": ["Data backup", "Managing data from creation to deletion", "Network management", "System management"],
                "correct_option_index": 1,
                "explanation": "Data lifecycle manages data throughout its entire existence."
            },
            {
                "question_text": "What is data access control?",
                "options": ["Data backup", "Restricting access to sensitive data", "Network access", "System access"],
                "correct_option_index": 1,
                "explanation": "Data access control limits who can access sensitive information."
            },
            {
                "question_text": "What is data integrity?",
                "options": ["Data completeness", "Maintaining accuracy and consistency of data", "Data backup", "Data security"],
                "correct_option_index": 1,
                "explanation": "Data integrity ensures information accuracy and consistency."
            },
            {
                "question_text": "What is data availability?",
                "options": ["Data existence", "Ensuring data is accessible when needed", "Data backup", "Data security"],
                "correct_option_index": 1,
                "explanation": "Data availability ensures information is accessible to authorized users."
            },
            {
                "question_text": "What is data confidentiality?",
                "options": ["Data secrecy", "Preventing unauthorized data disclosure", "Data backup", "Data security"],
                "correct_option_index": 1,
                "explanation": "Data confidentiality prevents unauthorized access to information."
            },
            {
                "question_text": "What is data backup?",
                "options": ["Data copying", "Creating copies of data for recovery", "Data deletion", "Data security"],
                "correct_option_index": 1,
                "explanation": "Data backup creates copies for disaster recovery."
            },
            {
                "question_text": "What is data recovery?",
                "options": ["Data restoration", "Restoring data after loss or corruption", "Data backup", "Data security"],
                "correct_option_index": 1,
                "explanation": "Data recovery restores information after incidents."
            },
            {
                "question_text": "What is data archiving?",
                "options": ["Data storage", "Long-term storage of inactive data", "Data backup", "Data deletion"],
                "correct_option_index": 1,
                "explanation": "Data archiving stores inactive data for long periods."
            },
            {
                "question_text": "What is data security?",
                "options": ["Data protection", "Protecting data from unauthorized access", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Data security protects information from unauthorized access."
            },
            {
                "question_text": "What is data privacy impact assessment (DPIA)?",
                "options": ["Data assessment", "Evaluating privacy risks of data processing", "Network assessment", "System assessment"],
                "correct_option_index": 1,
                "explanation": "DPIA assesses privacy risks of data processing activities."
            },
            {
                "question_text": "What is data subject rights?",
                "options": ["User rights", "Rights of individuals over their personal data", "Network rights", "System rights"],
                "correct_option_index": 1,
                "explanation": "Data subject rights give individuals control over their data."
            },
            {
                "question_text": "What is data portability?",
                "options": ["Data transfer", "Right to transfer data between services", "Network portability", "System portability"],
                "correct_option_index": 1,
                "explanation": "Data portability allows transferring data between services."
            },
            {
                "question_text": "What is data erasure?",
                "options": ["Data deletion", "Right to have personal data deleted", "Network erasure", "System erasure"],
                "correct_option_index": 1,
                "explanation": "Data erasure is the right to have personal data deleted."
            },
            {
                "question_text": "What is data processing?",
                "options": ["Data handling", "Any operation performed on personal data", "Network processing", "System processing"],
                "correct_option_index": 1,
                "explanation": "Data processing includes any operation on personal information."
            },
            {
                "question_text": "What is data controller?",
                "options": ["Data manager", "Entity determining data processing purposes", "Network controller", "System controller"],
                "correct_option_index": 1,
                "explanation": "Data controllers determine why and how data is processed."
            },
            {
                "question_text": "What is data processor?",
                "options": ["Data worker", "Entity processing data on behalf of controller", "Network processor", "System processor"],
                "correct_option_index": 1,
                "explanation": "Data processors handle data on behalf of controllers."
            },
            {
                "question_text": "What is data protection officer (DPO)?",
                "options": ["Data manager", "Person overseeing data protection compliance", "Network officer", "System officer"],
                "correct_option_index": 1,
                "explanation": "DPOs ensure compliance with data protection regulations."
            },
            {
                "question_text": "What is data protection impact assessment?",
                "options": ["Data assessment", "Systematic evaluation of data processing risks", "Network assessment", "System assessment"],
                "correct_option_index": 1,
                "explanation": "DPIA systematically evaluates risks of data processing."
            },
            {
                "question_text": "What is data breach notification?",
                "options": ["Data reporting", "Reporting data breaches to authorities", "Network notification", "System notification"],
                "correct_option_index": 1,
                "explanation": "Breach notification reports incidents to authorities."
            },
            {
                "question_text": "What is data protection by design?",
                "options": ["Data design", "Building privacy into systems from start", "Network design", "System design"],
                "correct_option_index": 1,
                "explanation": "Privacy by design builds protection into systems."
            },
            {
                "question_text": "What is data protection by default?",
                "options": ["Data default", "Maximum privacy settings by default", "Network default", "System default"],
                "correct_option_index": 1,
                "explanation": "Privacy by default provides maximum protection automatically."
            },
            {
                "question_text": "What is data security awareness?",
                "options": ["Data knowledge", "Educating about data protection", "Network awareness", "System awareness"],
                "correct_option_index": 1,
                "explanation": "Data security awareness educates about protection measures."
            },
            {
                "question_text": "What is data compliance?",
                "options": ["Data rules", "Adhering to data protection regulations", "Network compliance", "System compliance"],
                "correct_option_index": 1,
                "explanation": "Data compliance ensures adherence to regulations."
            }
        ]
    },
    {
        "slug": "social-engineering-defense",
        "title": "Social Engineering Defense",
        "description": "Recognizing and defending against social engineering attacks",
        "category": "Social Engineering",
        "type": "awareness",
        "difficulty": "beginner",
        "estimated_minutes": 30,
        "pass_percentage": 70,
        "is_active": True,
        "questions": [
            {
                "question_text": "What is social engineering?",
                "options": ["Social media engineering", "Manipulating people to reveal information", "Network engineering", "System engineering"],
                "correct_option_index": 1,
                "explanation": "Social engineering manipulates people into revealing confidential information."
            },
            {
                "question_text": "What is phishing?",
                "options": ["Fishing activity", "Tricking users to reveal sensitive information", "Network fishing", "System fishing"],
                "correct_option_index": 1,
                "explanation": "Phishing tricks users into revealing credentials or sensitive data."
            },
            {
                "question_text": "What is spear phishing?",
                "options": ["Targeted fishing", "Phishing targeting specific individuals", "Network phishing", "System phishing"],
                "correct_option_index": 1,
                "explanation": "Spear phishing targets specific individuals or organizations."
            },
            {
                "question_text": "What is vishing?",
                "options": ["Voice phishing", "Phishing via phone calls", "Video phishing", "Virtual phishing"],
                "correct_option_index": 0,
                "explanation": "Vishing uses phone calls to trick victims."
            },
            {
                "question_text": "What is smishing?",
                "options": ["SMS phishing", "Phishing via text messages", "Social media phishing", "System phishing"],
                "correct_option_index": 0,
                "explanation": "Smishing uses SMS messages to trick victims."
            },
            {
                "question_text": "What is pretexting?",
                "options": ["Creating pretext", "Creating a fabricated scenario to obtain information", "Network pretexting", "System pretexting"],
                "correct_option_index": 1,
                "explanation": "Pretexting creates a convincing scenario to manipulate victims."
            },
            {
                "question_text": "What is baiting?",
                "options": ["Fishing bait", "Using bait to trick victims", "Network baiting", "System baiting"],
                "correct_option_index": 1,
                "explanation": "Baiting uses attractive offers to lure victims."
            },
            {
                "question_text": "What is tailgating?",
                "options": ["Following cars", "Following authorized persons into secure areas", "Network tailgating", "System tailgating"],
                "correct_option_index": 1,
                "explanation": "Tailgating follows authorized personnel to gain physical access."
            },
            {
                "question_text": "What is shoulder surfing?",
                "options": ["Water surfing", "Looking over someone's shoulder to obtain information", "Network surfing", "System surfing"],
                "correct_option_index": 1,
                "explanation": "Shoulder surfing observes victims entering sensitive information."
            },
            {
                "question_text": "What is dumpster diving?",
                "options": ["Searching trash for information", "Swimming in dumpsters", "Network diving", "System diving"],
                "correct_option_index": 0,
                "explanation": "Dumpster diving searches trash for sensitive information."
            },
            {
                "question_text": "What is a social engineering red flag?",
                "options": ["Warning indicator", "Sign that might indicate social engineering", "Network flag", "System flag"],
                "correct_option_index": 1,
                "explanation": "Red flags are warning signs of potential social engineering."
            },
            {
                "question_text": "What is urgency in social engineering?",
                "options": ["Quick action", "Creating false sense of urgency", "Network urgency", "System urgency"],
                "correct_option_index": 1,
                "explanation": "Attackers create urgency to bypass critical thinking."
            },
            {
                "question_text": "What is authority abuse?",
                "options": ["Power abuse", "Impersonating authority figures", "Network authority", "System authority"],
                "correct_option_index": 1,
                "explanation": "Authority abuse impersonates trusted authority figures."
            },
            {
                "question_text": "What is help desk scam?",
                "options": ["Help desk support", "Impersonating IT support to gain access", "Network help", "System help"],
                "correct_option_index": 1,
                "explanation": "Help desk scams impersonate IT support personnel."
            },
            {
                "question_text": "What is CEO fraud?",
                "options": ["CEO crimes", "Impersonating executives for financial fraud", "Network fraud", "System fraud"],
                "correct_option_index": 1,
                "explanation": "CEO fraud impersonates executives to authorize fraudulent transfers."
            },
            {
                "question_text": "What is romance scam?",
                "options": ["Dating scam", "Building fake relationships for financial gain", "Network romance", "System romance"],
                "correct_option_index": 1,
                "explanation": "Romance scams create fake relationships to extract money."
            },
            {
                "question_text": "What is lottery scam?",
                "options": ["Gaming lottery", "Fake lottery winnings to obtain money", "Network lottery", "System lottery"],
                "correct_option_index": 1,
                "explanation": "Lottery scams claim fake winnings to collect fees."
            },
            {
                "question_text": "What is tech support scam?",
                "options": ["Technical support", "Fake technical support to gain access", "Network support", "System support"],
                "correct_option_index": 1,
                "explanation": "Tech support scams impersonate technical support services."
            },
            {
                "question_text": "What is social engineering awareness?",
                "options": ["Social awareness", "Education about social engineering threats", "Network awareness", "System awareness"],
                "correct_option_index": 1,
                "explanation": "Awareness education helps recognize and prevent attacks."
            },
            {
                "question_text": "What is verification?",
                "options": ["Confirming authenticity", "Verifying identity before providing information", "Network verification", "System verification"],
                "correct_option_index": 1,
                "explanation": "Verification confirms identity before sharing sensitive information."
            },
            {
                "question_text": "What is skepticism in security?",
                "options": ["Doubt", "Questioning unusual requests", "Network skepticism", "System skepticism"],
                "correct_option_index": 1,
                "explanation": "Skepticism involves questioning unusual requests."
            },
            {
                "question_text": "What is incident reporting?",
                "options": ["Incident creation", "Reporting suspicious activities", "Network reporting", "System reporting"],
                "correct_option_index": 1,
                "explanation": "Incident reporting helps prevent further attacks."
            },
            {
                "question_text": "What is security policy?",
                "options": ["Security rules", "Organizational rules for security", "Network policy", "System policy"],
                "correct_option_index": 1,
                "explanation": "Security policies define rules for protecting information."
            },
            {
                "question_text": "What is security training?",
                "options": ["Security education", "Teaching employees about security", "Network training", "System training"],
                "correct_option_index": 1,
                "explanation": "Security training educates employees about threats."
            },
            {
                "question_text": "What is multi-factor authentication?",
                "options": ["Multiple passwords", "Multiple verification methods", "Network authentication", "System authentication"],
                "correct_option_index": 1,
                "explanation": "MFA requires multiple forms of authentication."
            },
            {
                "question_text": "What is email security?",
                "options": ["Email protection", "Protecting email from threats", "Network security", "System security"],
                "correct_option_index": 1,
                "explanation": "Email security protects against phishing and malware."
            },
            {
                "question_text": "What is URL validation?",
                "options": ["URL checking", "Verifying links before clicking", "Network validation", "System validation"],
                "correct_option_index": 1,
                "explanation": "URL validation checks links for safety."
            },
            {
                "question_text": "What is attachment scanning?",
                "options": ["File scanning", "Scanning email attachments for malware", "Network scanning", "System scanning"],
                "correct_option_index": 1,
                "explanation": "Attachment scanning detects malicious files."
            },
            {
                "question_text": "What is caller ID spoofing?",
                "options": ["Fake caller ID", "Faking caller ID information", "Network spoofing", "System spoofing"],
                "correct_option_index": 1,
                "explanation": "Caller ID spoofing falsifies caller identification."
            },
            {
                "question_text": "What is website verification?",
                "options": ["Site checking", "Verifying website authenticity", "Network verification", "System verification"],
                "correct_option_index": 1,
                "explanation": "Website verification confirms site legitimacy."
            },
            {
                "question_text": "What is information classification?",
                "options": ["Data classification", "Categorizing information by sensitivity", "Network classification", "System classification"],
                "correct_option_index": 1,
                "explanation": "Information classification protects sensitive data."
            },
            {
                "question_text": "What is need-to-know principle?",
                "options": ["Information need", "Providing only necessary information", "Network principle", "System principle"],
                "correct_option_index": 1,
                "explanation": "Need-to-know limits access to required information."
            },
            {
                "question_text": "What is background check?",
                "options": ["History check", "Verifying person's background", "Network check", "System check"],
                "correct_option_index": 1,
                "explanation": "Background checks verify trustworthiness."
            },
            {
                "question_text": "What is security culture?",
                "options": ["Security environment", "Organizational commitment to security", "Network culture", "System culture"],
                "correct_option_index": 1,
                "explanation": "Security culture promotes security awareness."
            },
            {
                "question_text": "What is threat intelligence?",
                "options": ["Threat information", "Information about current threats", "Network intelligence", "System intelligence"],
                "correct_option_index": 1,
                "explanation": "Threat intelligence provides information about threats."
            },
            {
                "question_text": "What is security awareness program?",
                "options": ["Security education program", "Comprehensive security training program", "Network program", "System program"],
                "correct_option_index": 1,
                "explanation": "Security awareness programs provide ongoing education."
            },
            {
                "question_text": "What is phishing simulation?",
                "options": ["Phishing practice", "Controlled phishing attacks for training", "Network simulation", "System simulation"],
                "correct_option_index": 1,
                "explanation": "Phishing simulations train employees to recognize attacks."
            },
            {
                "question_text": "What is security metrics?",
                "options": ["Security measurements", "Measuring security program effectiveness", "Network metrics", "System metrics"],
                "correct_option_index": 1,
                "explanation": "Security metrics measure program effectiveness."
            },
            {
                "question_text": "What is continuous education?",
                "options": ["Ongoing learning", "Regular security training updates", "Network education", "System education"],
                "correct_option_index": 1,
                "explanation": "Continuous education keeps security knowledge current."
            },
            {
                "question_text": "What is human firewall?",
                "options": ["Network firewall", "Employees as first line of defense", "System firewall", "Physical firewall"],
                "correct_option_index": 1,
                "explanation": "Human firewall concept treats employees as security defenders."
            },
            {
                "question_text": "What is security mindset?",
                "options": ["Security thinking", "Approaching situations with security awareness", "Network mindset", "System mindset"],
                "correct_option_index": 1,
                "explanation": "Security mindset incorporates security into daily decisions."
            },
            {
                "question_text": "What is social engineering resistance?",
                "options": ["Social resistance", "Building resistance to manipulation", "Network resistance", "System resistance"],
                "correct_option_index": 1,
                "explanation": "Resistance training builds defenses against manipulation."
            }
        ]
    }
]
