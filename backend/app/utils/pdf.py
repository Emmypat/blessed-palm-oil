import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


BRAND_ORANGE = colors.HexColor("#f97316")
BRAND_DARK = colors.HexColor("#1e293b")
LIGHT_GRAY = colors.HexColor("#f1f5f9")
MID_GRAY = colors.HexColor("#94a3b8")


def format_naira(amount: float) -> str:
    return f"\u20a6{amount:,.2f}"


def generate_receipt_pdf(sale: dict) -> bytes:
    """
    Generate a PDF receipt for a sale.

    sale dict keys:
      id, customer_name, customer_email, payment_method,
      payment_reference, total, is_credit, created_at,
      items: [{name, qty, unit_price, subtotal}]
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Header
    header_style = ParagraphStyle("header", fontSize=22, fontName="Helvetica-Bold",
                                   textColor=BRAND_ORANGE, alignment=TA_CENTER)
    sub_style = ParagraphStyle("sub", fontSize=10, fontName="Helvetica",
                                textColor=MID_GRAY, alignment=TA_CENTER)
    story.append(Paragraph("CementTrack", header_style))
    story.append(Paragraph("Business Manager · eu-west-1", sub_style))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_ORANGE))
    story.append(Spacer(1, 6 * mm))

    # Receipt title
    title_style = ParagraphStyle("title", fontSize=14, fontName="Helvetica-Bold",
                                  textColor=BRAND_DARK, alignment=TA_CENTER)
    story.append(Paragraph("SALES RECEIPT", title_style))
    story.append(Spacer(1, 6 * mm))

    # Meta info table
    created_at = sale.get("created_at", datetime.now())
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    meta = [
        ["Receipt No:", f"#{sale['id']:05d}"],
        ["Date:", created_at.strftime("%d %b %Y, %H:%M")],
        ["Customer:", sale.get("customer_name") or "Walk-in Customer"],
        ["Payment:", sale.get("payment_method", "").replace("_", " ").title()],
    ]
    if sale.get("payment_reference"):
        meta.append(["Reference:", sale["payment_reference"]])
    if sale.get("is_credit"):
        meta.append(["Sale Type:", "Credit Sale"])

    meta_table = Table(meta, colWidths=[45 * mm, 115 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), MID_GRAY),
        ("TEXTCOLOR", (1, 0), (1, -1), BRAND_DARK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    # Items table
    item_header = [["Product", "Qty", "Unit Price", "Subtotal"]]
    item_rows = []
    for item in sale.get("items", []):
        item_rows.append([
            item.get("name", "Unknown"),
            str(item.get("qty", 0)),
            format_naira(float(item.get("unit_price", 0))),
            format_naira(float(item.get("subtotal", 0))),
        ])

    item_data = item_header + item_rows
    col_widths = [80 * mm, 20 * mm, 40 * mm, 40 * mm]
    items_table = Table(item_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_ORANGE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        # Data rows
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4 * mm))

    # Total
    total_data = [["", "", "TOTAL", format_naira(float(sale.get("total", 0)))]]
    total_table = Table(total_data, colWidths=col_widths)
    total_table.setStyle(TableStyle([
        ("BACKGROUND", (2, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (2, 0), (-1, 0), colors.white),
        ("FONTNAME", (2, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (2, 0), (-1, 0), 11),
        ("ALIGN", (2, 0), (-1, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 10 * mm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY))
    story.append(Spacer(1, 4 * mm))
    footer_style = ParagraphStyle("footer", fontSize=9, fontName="Helvetica",
                                   textColor=MID_GRAY, alignment=TA_CENTER)
    story.append(Paragraph("Thank you for your business!", footer_style))
    story.append(Paragraph("For enquiries contact: patkatech@gmail.com", footer_style))

    doc.build(story)
    return buffer.getvalue()
