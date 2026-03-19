from database import SessionLocal
import models
from rag.ingestion import process_and_store_document
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

def seed():
    db = SessionLocal()
    
    # Ensure there's an admin user for the 'uploaded_by' field if needed
    admin = db.query(models.User).filter(models.User.role == 'admin').first()
    admin_id = admin.id if admin else None

    # List of initial documents to seed
    docs = [
        {
            "filename": "Attendance_Policy_2026.txt",
            "content": """
Attendance Policy: All students must maintain a minimum of 75% attendance in each subject to be eligible for the end-semester examinations. 
Medical leaves are considered only if a valid medical certificate from a registered practitioner is submitted within 3 days of returning to campus.
Shortage of attendance may result in being barred from writing the exams.
            """
        },
        {
            "filename": "Library_Services.txt",
            "content": """
Library Timings and Rules:
The Central Library is open from 8:00 AM to 10:00 PM on weekdays.
On Sundays and Public Holidays, the library operates from 10:00 AM to 4:00 PM.
Students can borrow up to 4 books at a time for a period of 14 days.
Late fine for overdue books is $0.50 per day per book. 
The digital library section is available 24/7 via the campus portal.
            """
        },
        {
            "filename": "Exam_Schedule_Autumn_2026.txt",
            "content": """
Autumn Semester 2026 Examination Schedule:
Mid-Semester Exams: October 12 to October 20, 2026.
Final Semester Exams: December 15 to December 30, 2026.
Results Declaration: January 15, 2027.
All exams are conducted in the Main Academic Block (Rooms 101 to 405).
Admit cards will be available for download one week prior to the exam start date.
            """
        },
        {
            "filename": "Student_Support_Services.txt",
            "content": """
Campus Student Services:
Medical Center: Located near the North Gate, open 24/7 for emergencies.
Counseling Cell: Available in the Student Center from 9 AM to 5 PM (Monday to Friday).
Financial Aid Office: Room 12, Administrative Block. Assists with scholarships and loan applications.
Career Placement Cell: Block D, 2nd Floor. Conducts mock interviews and campus placements.
            """
        },
        {
            "filename": "Enrollment_Guide.txt",
            "content": """
How to Enroll for Courses:
1. Log in to the University Portal.
2. Navigate to the 'Course Registration' tab.
3. Select your department and required courses according to the syllabus.
4. Confirm your selection and pay the semester fee through the integrated payment gateway.
5. Once payment is confirmed, you will receive a registration receipt via email.
Registration for the Autumn 2026 semester closes on August 31, 2026.
            """
        }
    ]

    print(f"Seeding {len(docs)} documents...")
    
    for doc_data in docs:
        # Create the Document entry
        new_doc = models.Document(
            filename=doc_data["filename"],
            uploaded_by=admin_id
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        # Process and store the document (this will generate embeddings)
        process_and_store_document(
            db=db,
            document_id=new_doc.id,
            file_content=doc_data["content"].encode("utf-8"),
            filename=doc_data["filename"]
        )
    
    db.close()
    print("Seeding complete!")

if __name__ == "__main__":
    seed()
