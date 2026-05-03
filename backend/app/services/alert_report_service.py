from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, PageBreak

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.analyst_note import AnalystNote
from app.models.user import User
from app.services.alert_service import AlertService
from app.services.audit_service import AuditService


class AlertReportService:
    """Service for generating PDF incident reports for alerts"""

    @staticmethod
    def _get_or_not_none(value: Any) -> str:
        """Helper to get string value or 'Not available'"""
        if value is None:
            return "Not available"
        return str(value)

    @staticmethod
    def _sanitize_message(message: str) -> str:
        """Sanitize log messages for PDF display"""
        # Remove potential HTML tags and limit length
        sanitized = message.replace("<", "&lt;").replace(">", "&gt;")
        if len(sanitized) > 200:
            sanitized = sanitized[:200] + "..."
        return sanitized

    @staticmethod
    def _get_recommended_actions(alert: Alert) -> list[str]:
        """Generate recommended actions based on alert type and severity"""
        actions = []
        
        # Get attack type from detection rule or alert title
        attack_type = ""
        if alert.detection_rule:
            attack_type = alert.detection_rule.category.lower()
        elif alert.title:
            attack_type = alert.title.lower()
        
        severity = alert.severity.lower()
        
        # Brute Force / Failed Login
        if any(keyword in attack_type for keyword in ["brute", "failed", "login", "authentication"]):
            actions.extend([
                "Review source IP reputation and geolocation.",
                "Verify affected user account activity for anomalies.",
                "Reset password if compromise is suspected.",
                "Enable or verify multi-factor authentication (MFA).",
                "Consider blocking source IP if confirmed malicious."
            ])
        
        # SQL Injection
        elif any(keyword in attack_type for keyword in ["sql", "injection", "xss", "sqli"]):
            actions.extend([
                "Review targeted endpoint and input validation.",
                "Check web server/application logs for successful exploitation.",
                "Patch vulnerable parameter handling immediately.",
                "Add or tune Web Application Firewall (WAF) rules.",
                "Monitor for follow-up requests from the same source."
            ])
        
        # Suspicious Admin Login
        elif any(keyword in attack_type for keyword in ["admin", "privilege", "escalation"]):
            actions.extend([
                "Verify login location and source IP legitimacy.",
                "Review recent administrative actions for anomalies.",
                "Rotate credentials if activity appears suspicious.",
                "Revoke active sessions if compromise suspected.",
                "Ensure admin 2FA is properly enforced."
            ])
        
        # 404 Scanning / Recon
        elif any(keyword in attack_type for keyword in ["scan", "recon", "404", "probe", "enum"]):
            actions.extend([
                "Review requested paths for sensitive targets.",
                "Block noisy scanners if they pose a threat.",
                "Add suppression rules if scanner is benign.",
                "Monitor for follow-up exploit attempts.",
                "Update security controls based on scanned targets."
            ])
        
        # Generic High/Critical
        elif severity in ["high", "critical"]:
            actions.extend([
                "Escalate to senior security analyst immediately.",
                "Preserve all related logs as evidence.",
                "Correlate with existing incidents and threat intelligence.",
                "Review affected user accounts and assets.",
                "Consider temporary containment measures."
            ])
        
        # Default actions
        else:
            actions.extend([
                "Review alert details and context.",
                "Check for related alerts or patterns.",
                "Update detection rules if this is a false positive.",
                "Document findings and resolution steps."
            ])
        
        # Add severity-specific actions
        if severity == "critical":
            actions.insert(0, "IMMEDIATE ATTENTION REQUIRED: Critical severity alert.")
        elif severity == "high":
            actions.insert(0, "High priority - address within 4 hours.")
        
        return actions

    @staticmethod
    def _create_header_styles() -> dict[str, ParagraphStyle]:
        """Create custom styles for the PDF"""
        styles = getSampleStyleSheet()
        
        # Custom header style
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#0f172a'),
            alignment=1  # Center
        )
        
        # Custom subheader style
        subheader_style = ParagraphStyle(
            'CustomSubHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=colors.HexColor('#334155'),
            alignment=1
        )
        
        # Section header style
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=10,
            spaceBefore=20,
            textColor=colors.HexColor('#0f172a'),
            borderWidth=0,
            borderColor=colors.transparent
        )
        
        return {
            'header': header_style,
            'subheader': subheader_style,
            'section': section_style,
            'normal': styles['BodyText'],
            'small': styles['Normal']
        }

    @staticmethod
    def _create_cover_page(alert: Alert, styles: dict[str, ParagraphStyle]) -> list:
        """Create the cover page elements"""
        elements = []
        
        # Add spacing at top
        elements.append(Spacer(1, 2*inch))
        
        # Main title
        elements.append(Paragraph("LogShield Security Report", styles['header']))
        elements.append(Spacer(1, 0.3*inch))
        
        # Subtitle
        elements.append(Paragraph("Incident Report", styles['subheader']))
        elements.append(Spacer(1, 0.5*inch))
        
        # Alert details in a table
        cover_data = [
            ['Alert ID:', str(alert.id)],
            ['Severity:', alert.severity.upper()],
            ['Status:', alert.status.replace('_', ' ').title()],
            ['Risk Score:', str(alert.risk_score)],
            ['Generated:', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')]
        ]
        
        cover_table = Table(cover_data, colWidths=[2*inch, 4*inch])
        cover_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOLD', (0, 0), (0, -1), True),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 0), (1, -1), colors.white),
        ]))
        
        elements.append(cover_table)
        elements.append(Spacer(1, 1*inch))
        
        # Severity badge (visual representation)
        severity_color = {
            'low': colors.HexColor('#22c55e'),
            'medium': colors.HexColor('#f59e0b'),
            'high': colors.HexColor('#f97316'),
            'critical': colors.HexColor('#ef4444')
        }.get(alert.severity.lower(), colors.grey)
        
        severity_text = Paragraph(
            f'<font color="{severity_color.hexval}" size="16"><b>SEVERITY: {alert.severity.upper()}</b></font>',
            styles['normal']
        )
        elements.append(severity_text)
        
        return elements

    @staticmethod
    def _create_executive_summary(alert: Alert, styles: dict[str, ParagraphStyle]) -> list:
        """Create executive summary section"""
        elements = []
        
        elements.append(Paragraph("Executive Summary", styles['section']))
        
        # Build summary paragraph
        attack_type = alert.detection_rule.category if alert.detection_rule else "Unknown"
        source_ip = "Unknown"
        target = "Unknown"
        
        # Get source IP and target from related logs
        if hasattr(alert, 'normalized_log') and alert.normalized_log:
            if alert.normalized_log.src_ip:
                source_ip = alert.normalized_log.src_ip
            if alert.normalized_log.username:
                target = f"user {alert.normalized_log.username}"
            elif alert.normalized_log.hostname:
                target = f"host {alert.normalized_log.hostname}"
            elif alert.normalized_log.path:
                target = f"endpoint {alert.normalized_log.path}"
        
        summary = f"""
        This report documents a {alert.severity} security alert related to {attack_type} 
        observed from {source_ip} targeting {target}. The alert was generated on 
        {alert.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')} with a risk score of {alert.risk_score}.
        Current status is {alert.status.replace('_', ' ').title()}.
        """.strip()
        
        elements.append(Paragraph(summary, styles['normal']))
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _create_alert_overview(alert: Alert, styles: dict[str, ParagraphStyle]) -> list:
        """Create alert overview table"""
        elements = []
        
        elements.append(Paragraph("Alert Overview", styles['section']))
        
        # Get additional details
        assigned_to = alert.assigned_to.full_name if alert.assigned_to else "Not assigned"
        mitre_tactic = alert.detection_rule.mitre_tactic if alert.detection_rule else "Not available"
        mitre_technique = alert.detection_rule.mitre_technique if alert.detection_rule else "Not available"
        
        # Get source IP and target from logs
        source_ip = "Not available"
        target_user = "Not available"
        target_endpoint = "Not available"
        
        if alert.normalized_log:
            source_ip = AlertReportService._get_or_not_none(alert.normalized_log.src_ip)
            target_user = AlertReportService._get_or_not_none(alert.normalized_log.username)
            target_endpoint = AlertReportService._get_or_not_none(alert.normalized_log.path)
        
        overview_data = [
            ['Field', 'Value'],
            ['Alert ID', str(alert.id)],
            ['Title', alert.title],
            ['Attack Type', alert.detection_rule.category if alert.detection_rule else "Not available"],
            ['Severity', alert.severity.upper()],
            ['Risk Score', str(alert.risk_score)],
            ['Status', alert.status.replace('_', ' ').title()],
            ['Source IP', source_ip],
            ['Affected User', target_user],
            ['Target Endpoint', target_endpoint],
            ['Assigned Analyst', assigned_to],
            ['Created At', alert.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
            ['Updated At', alert.updated_at.strftime('%Y-%m-%d %H:%M:%S UTC')],
        ]
        
        overview_table = Table(overview_data, colWidths=[2.5*inch, 4*inch])
        overview_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOLD', (0, 0), (-1, 0), True),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 1), (1, -1), colors.white),
        ]))
        
        elements.append(overview_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _create_mitre_mapping(alert: Alert, styles: dict[str, ParagraphStyle]) -> list:
        """Create MITRE ATT&CK mapping section"""
        elements = []
        
        elements.append(Paragraph("MITRE ATT&CK Mapping", styles['section']))
        
        tactic = alert.detection_rule.mitre_tactic if alert.detection_rule else "Not available"
        technique = alert.detection_rule.mitre_technique if alert.detection_rule else "Not available"
        
        mitre_data = [
            ['Field', 'Value'],
            ['Tactic', tactic],
            ['Technique', technique],
            ['Technique ID', AlertReportService._get_technique_id(technique)],
        ]
        
        mitre_table = Table(mitre_data, colWidths=[2*inch, 4*inch])
        mitre_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOLD', (0, 0), (-1, 0), True),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 1), (1, -1), colors.white),
        ]))
        
        elements.append(mitre_table)
        
        # Add technique description if available
        description = AlertReportService._get_technique_description(technique)
        if description and technique != "Not available":
            elements.append(Spacer(1, 0.2*inch))
            elements.append(Paragraph(f"<b>Description:</b> {description}", styles['small']))
        
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _get_technique_id(technique: str) -> str:
        """Map technique name to technique ID"""
        technique_map = {
            "Brute Force": "T1110",
            "Credential Stuffing": "T1110.004",
            "SQL Injection": "T1190",
            "Cross-Site Scripting": "T1203",
            "Privilege Escalation": "T1068",
            "Persistence": "TA0003",
            "Discovery": "TA0007",
            "Lateral Movement": "TA0008",
            "Collection": "TA0009",
            "Command and Control": "TA0011",
            "Exfiltration": "TA0010",
            "Impact": "TA0040",
        }
        return technique_map.get(technique, "Not available")

    @staticmethod
    def _get_technique_description(technique: str) -> str:
        """Get technique description"""
        descriptions = {
            "Brute Force": "Adversaries may use brute force techniques to gain access to accounts.",
            "SQL Injection": "Adversaries may exploit web application vulnerabilities to inject malicious SQL queries.",
            "Cross-Site Scripting": "Adversaries may inject malicious scripts into web pages viewed by other users.",
            "Privilege Escalation": "Adversaries may gain higher-level permissions on a system or network.",
            "Discovery": "Adversaries may attempt to gather information about the system and network.",
            "Lateral Movement": "Adversaries may move through the network to expand their access.",
        }
        return descriptions.get(technique, "")

    @staticmethod
    def _create_evidence_logs(alert: Alert, db: Session, styles: dict[str, ParagraphStyle]) -> list:
        """Create evidence logs section"""
        elements = []
        
        elements.append(Paragraph("Evidence Logs", styles['section']))
        
        # Get related logs
        related_logs = AlertService.related_logs(db, alert)
        
        if not related_logs:
            elements.append(Paragraph("No evidence logs available.", styles['normal']))
            elements.append(Spacer(1, 0.3*inch))
            return elements
        
        # Limit to 100 logs as per requirements
        logs_to_show = related_logs[:100]
        if len(related_logs) > 100:
            elements.append(Paragraph(f"Showing first 100 of {len(related_logs)} related logs.", styles['small']))
            elements.append(Spacer(1, 0.1*inch))
        
        # Create logs table
        logs_data = [['Timestamp', 'Source', 'Event Type', 'IP/User', 'Message']]
        
        for log in logs_to_show:
            timestamp = (log.event_time or log.created_at).strftime('%Y-%m-%d %H:%M:%S')
            source = log.source[:30] if log.source else "N/A"
            event_type = log.event_type[:25] if log.event_type else "N/A"
            ip_user = f"{log.src_ip or 'N/A'} / {log.username or 'N/A'}"
            message = AlertReportService._sanitize_message(log.message)[:80]
            
            logs_data.append([timestamp, source, event_type, ip_user, message])
        
        logs_table = Table(logs_data, colWidths=[1.5*inch, 1*inch, 1.2*inch, 1.3*inch, 2*inch])
        logs_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOLD', (0, 0), (-1, 0), True),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 1), (1, -1), colors.white),
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        
        elements.append(logs_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _create_risk_explanation(alert: Alert, db: Session, styles: dict[str, ParagraphStyle]) -> list:
        """Create risk explanation section"""
        elements = []
        
        elements.append(Paragraph("Risk Analysis", styles['section']))
        
        # Get risk score details
        risk_level = "Low"
        if alert.risk_score >= 80:
            risk_level = "Critical"
        elif alert.risk_score >= 60:
            risk_level = "High"
        elif alert.risk_score >= 40:
            risk_level = "Medium"
        
        # Try to get risk score explanation
        risk_explanation = "Risk score calculated based on alert severity, source IP reputation, and affected assets."
        
        # Check if there are risk scores with explanations
        if hasattr(alert, 'risk_scores') and alert.risk_scores:
            latest_risk = alert.risk_scores[0]  # Assuming ordered by calculated_at desc
            if latest_risk.explanation:
                risk_explanation = latest_risk.explanation
        
        risk_data = [
            ['Field', 'Value'],
            ['Risk Score', str(alert.risk_score)],
            ['Risk Level', risk_level],
            ['Severity', alert.severity.upper()],
            ['Explanation', risk_explanation],
        ]
        
        risk_table = Table(risk_data, colWidths=[2*inch, 4*inch])
        risk_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOLD', (0, 0), (-1, 0), True),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 1), (1, -1), colors.white),
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        
        elements.append(risk_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _create_recommended_actions(alert: Alert, styles: dict[str, ParagraphStyle]) -> list:
        """Create recommended actions section"""
        elements = []
        
        elements.append(Paragraph("Recommended Actions", styles['section']))
        
        actions = AlertReportService._get_recommended_actions(alert)
        
        for i, action in enumerate(actions, 1):
            elements.append(Paragraph(f"{i}. {action}", styles['normal']))
            elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Spacer(1, 0.2*inch))
        
        return elements

    @staticmethod
    def _create_analyst_notes(alert: Alert, db: Session, styles: dict[str, ParagraphStyle]) -> list:
        """Create analyst notes section"""
        elements = []
        
        elements.append(Paragraph("Analyst Notes", styles['section']))
        
        # Get analyst notes
        notes = db.query(AnalystNote).filter(AnalystNote.alert_id == alert.id).order_by(AnalystNote.created_at.desc()).all()
        
        if not notes:
            elements.append(Paragraph("No analyst notes available.", styles['normal']))
            elements.append(Spacer(1, 0.3*inch))
            return elements
        
        for note in notes:
            note_text = f"<b>{note.created_by.full_name if note.created_by else 'Unknown'}</b> - {note.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}<br/>"
            note_text += note.note_text
            
            elements.append(Paragraph(note_text, styles['small']))
            elements.append(Spacer(1, 0.2*inch))
        
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @staticmethod
    def _create_report_metadata(alert: Alert, generated_by: User, styles: dict[str, ParagraphStyle]) -> list:
        """Create report metadata section"""
        elements = []
        
        elements.append(Paragraph("Report Metadata", styles['section']))
        
        metadata_data = [
            ['Field', 'Value'],
            ['Generated By', generated_by.full_name or generated_by.email],
            ['Generated At', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')],
            ['Platform', 'LogShield Security Operations Center'],
            ['Alert ID', str(alert.id)],
            ['Report Version', '1.0'],
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOLD', (0, 0), (-1, 0), True),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('BACKGROUND', (1, 1), (1, -1), colors.white),
        ]))
        
        elements.append(metadata_table)
        elements.append(Spacer(1, 0.3*inch))
        
        return elements

    @classmethod
    def generate_incident_report(cls, *, db: Session, alert: Alert, generated_by: User) -> bytes:
        """Generate complete PDF incident report for an alert"""
        
        # Create audit log for report generation
        AuditService.create_audit_log(
            db=db,
            actor_user_id=generated_by.id,
            action="alert_incident_report_generated",
            entity_type="alert",
            entity_id=str(alert.id),
            details={
                "alert_id": alert.id,
                "generated_by_user_id": generated_by.id,
                "alert_severity": alert.severity,
                "alert_title": alert.title
            }
        )
        db.commit()
        
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # Get styles
        styles = cls._create_header_styles()
        
        # Build PDF elements
        elements = []
        
        # Cover page
        elements.extend(cls._create_cover_page(alert, styles))
        elements.append(PageBreak())
        
        # Executive Summary
        elements.extend(cls._create_executive_summary(alert, styles))
        
        # Alert Overview
        elements.extend(cls._create_alert_overview(alert, styles))
        
        # MITRE Mapping
        elements.extend(cls._create_mitre_mapping(alert, styles))
        
        # Evidence Logs
        elements.extend(cls._create_evidence_logs(alert, db, styles))
        
        # Risk Analysis
        elements.extend(cls._create_risk_explanation(alert, db, styles))
        
        # Recommended Actions
        elements.extend(cls._create_recommended_actions(alert, styles))
        
        # Analyst Notes
        elements.extend(cls._create_analyst_notes(alert, db, styles))
        
        # Report Metadata
        elements.extend(cls._create_report_metadata(alert, generated_by, styles))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
