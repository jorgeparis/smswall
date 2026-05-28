from models import SMSMessage
import os


def parse_sms_file(filepath: str) -> SMSMessage:
    # Try multiple encodings
    encodings = ["utf-8", "utf-16", "latin-1"]

    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc) as f:
                lines = f.readlines()
            break
        except UnicodeDecodeError:
            continue
    else:
        raise Exception("Unable to decode file")

    number = lines[0].strip()
    datetime_line = lines[1].strip()
    message = "".join(lines[2:]).strip()

    date, time = datetime_line.split(",")

    return SMSMessage(
        id=os.path.basename(filepath),
        number=number,
        date=date,
        time=time,
        message=message,
        is_new=True
    )
