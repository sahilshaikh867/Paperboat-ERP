import { PrismaClient, Role, SubjectComponentType, AttendanceStatus, QuestionType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface ValidationErrorItem {
  row: number;
  column: string;
  error: string;
  suggestedFix: string;
  rawData?: any;
}

export interface CSVValidationResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicatesCount: number;
  previewRows: any[];
  errors: ValidationErrorItem[];
  validRows: any[];
}

export class CSVImportService {
  /**
   * Return pre-formatted CSV template strings with headers and helpful sample rows
   */
  static getTemplate(type: 'student' | 'teacher' | 'question' | 'attendance'): { filename: string; content: string } {
    switch (type) {
      case 'student':
        return {
          filename: 'student_import_template.csv',
          content: [
            '# Student Enrollment CSV Template - ExamForge College ERP',
            '# Required columns: RollNumber, FullName, Email',
            '# Optional columns: PRNNumber, Phone',
            'RollNumber,FullName,Email,PRNNumber,Phone',
            '101,Aarav Sharma,aarav.sharma@example.edu,PRN2026101,+919876543210',
            '102,Diya Patel,diya.patel@example.edu,PRN2026102,+919876543211',
            '103,Rohan Verma,rohan.verma@example.edu,PRN2026103,+919876543212',
          ].join('\n'),
        };

      case 'teacher':
        return {
          filename: 'teacher_import_template.csv',
          content: [
            '# Faculty Members CSV Template - ExamForge College ERP',
            '# Required columns: FullName, Email, Department, Designation',
            '# Optional columns: Phone, Degree',
            'FullName,Email,Department,Designation,Phone,Degree',
            'Dr. Sarah Jenkins,s.jenkins@example.edu,Computer Engineering,Associate Professor,+14155552301,Ph.D. in Computer Science',
            'Prof. Alan Turing,a.turing@example.edu,Computer Engineering,Professor,+14155552302,Ph.D. in Mathematics',
          ].join('\n'),
        };

      case 'question':
        return {
          filename: 'question_bank_template.csv',
          content: [
            '# Question Bank CSV Template - ExamForge Online Assessment',
            '# Required columns: QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectOption (A/B/C/D), Marks',
            '# Optional columns: Explanation, NegativeMarks',
            'QuestionText,OptionA,OptionB,OptionC,OptionD,CorrectOption,Marks,Explanation,NegativeMarks',
            '"What is the time complexity of binary search on a sorted array?","O(n)","O(log n)","O(n log n)","O(1)",B,2,"Binary search divides the search space in half each step",0.5',
            '"Which protocol operates at the Transport Layer?","IP","HTTP","TCP","Ethernet",C,1,"TCP provides reliable end-to-end transport",0',
          ].join('\n'),
        };

      case 'attendance':
        return {
          filename: 'attendance_template.csv',
          content: [
            '# Class Attendance Sheet CSV Template - ExamForge College ERP',
            '# Required columns: RollNumber, Date (YYYY-MM-DD), Status (PRESENT/ABSENT/LATE/LEAVE)',
            '# Optional columns: Remarks',
            'RollNumber,Date,Status,Remarks',
            '101,2026-09-21,PRESENT,Attended full lecture',
            '102,2026-09-21,ABSENT,Medical leave application pending',
            '103,2026-09-21,LATE,Joined 15 minutes late',
          ].join('\n'),
        };

      default:
        throw new Error(`Unsupported template type: ${type}`);
    }
  }

  /**
   * Validate uploaded CSV dataset row-by-row before committing to database
   */
  static async validate(
    type: 'student' | 'teacher' | 'question' | 'attendance',
    rows: any[],
    organizationId: string,
    context?: { classId?: string; subjectId?: string }
  ): Promise<CSVValidationResult> {
    const errors: ValidationErrorItem[] = [];
    const validRows: any[] = [];
    const seenKeys = new Set<string>();
    let duplicatesCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Skip comment rows or empty rows
      const firstVal = Object.values(row)[0];
      if (typeof firstVal === 'string' && firstVal.startsWith('#')) {
        continue;
      }

      if (type === 'student') {
        const rollNumber = String(row.RollNumber || row.rollNumber || '').trim();
        const fullName = String(row.FullName || row.fullName || '').trim();
        const email = String(row.Email || row.email || '').trim().toLowerCase();
        const prnNumber = String(row.PRNNumber || row.prnNumber || '').trim();
        const phone = String(row.Phone || row.phone || '').trim();

        let hasError = false;

        if (!rollNumber) {
          errors.push({
            row: rowNum,
            column: 'RollNumber',
            error: 'Missing required Roll Number.',
            suggestedFix: 'Provide a valid unique roll number like "101" or "CS-01".',
            rawData: row,
          });
          hasError = true;
        }

        if (!fullName) {
          errors.push({
            row: rowNum,
            column: 'FullName',
            error: 'Missing student full name.',
            suggestedFix: 'Enter candidate full name.',
            rawData: row,
          });
          hasError = true;
        }

        if (!email || !emailRegex.test(email)) {
          errors.push({
            row: rowNum,
            column: 'Email',
            error: 'Invalid or missing email address.',
            suggestedFix: 'Provide a valid standard email format (e.g., student@college.edu).',
            rawData: row,
          });
          hasError = true;
        }

        // Deduplication check within file
        if (seenKeys.has(rollNumber)) {
          errors.push({
            row: rowNum,
            column: 'RollNumber',
            error: `Duplicate roll number "${rollNumber}" found in this file.`,
            suggestedFix: 'Ensure every student has a unique roll number.',
            rawData: row,
          });
          duplicatesCount++;
          hasError = true;
        } else if (rollNumber) {
          seenKeys.add(rollNumber);
        }

        if (!hasError) {
          validRows.push({ rollNumber, fullName, email, prnNumber: prnNumber || null, phone: phone || null });
        }
      } else if (type === 'teacher') {
        const fullName = String(row.FullName || row.fullName || '').trim();
        const email = String(row.Email || row.email || '').trim().toLowerCase();
        const department = String(row.Department || row.department || '').trim();
        const designation = String(row.Designation || row.designation || 'Assistant Professor').trim();
        const phone = String(row.Phone || row.phone || '').trim();
        const degree = String(row.Degree || row.degree || '').trim();

        let hasError = false;

        if (!fullName) {
          errors.push({
            row: rowNum,
            column: 'FullName',
            error: 'Missing faculty full name.',
            suggestedFix: 'Enter faculty name (e.g. Dr. John Doe).',
            rawData: row,
          });
          hasError = true;
        }

        if (!email || !emailRegex.test(email)) {
          errors.push({
            row: rowNum,
            column: 'Email',
            error: 'Invalid or missing email address.',
            suggestedFix: 'Enter valid official faculty email.',
            rawData: row,
          });
          hasError = true;
        }

        if (seenKeys.has(email)) {
          errors.push({
            row: rowNum,
            column: 'Email',
            error: `Duplicate email "${email}" in file.`,
            suggestedFix: 'Remove or correct duplicate row.',
            rawData: row,
          });
          duplicatesCount++;
          hasError = true;
        } else if (email) {
          seenKeys.add(email);
        }

        if (!hasError) {
          validRows.push({ fullName, email, department, designation, phone: phone || null, degree: degree || null });
        }
      } else if (type === 'question') {
        const questionText = String(row.QuestionText || row.questionText || '').trim();
        const optA = String(row.OptionA || row.optionA || '').trim();
        const optB = String(row.OptionB || row.optionB || '').trim();
        const optC = String(row.OptionC || row.optionC || '').trim();
        const optD = String(row.OptionD || row.optionD || '').trim();
        const correctOpt = String(row.CorrectOption || row.correctOption || '').trim().toUpperCase();
        const marks = Number(row.Marks || row.marks || 1);
        const negMarks = Number(row.NegativeMarks || row.negativeMarks || 0);
        const explanation = String(row.Explanation || row.explanation || '').trim();

        let hasError = false;

        if (!questionText) {
          errors.push({
            row: rowNum,
            column: 'QuestionText',
            error: 'Missing question text.',
            suggestedFix: 'Provide full question text.',
            rawData: row,
          });
          hasError = true;
        }

        if (!optA || !optB) {
          errors.push({
            row: rowNum,
            column: 'OptionA/OptionB',
            error: 'Multiple choice questions require at least Option A and Option B.',
            suggestedFix: 'Provide options for choice selection.',
            rawData: row,
          });
          hasError = true;
        }

        if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
          errors.push({
            row: rowNum,
            column: 'CorrectOption',
            error: `Invalid correct option key "${correctOpt}". Must be A, B, C, or D.`,
            suggestedFix: 'Specify A, B, C, or D as the correct option.',
            rawData: row,
          });
          hasError = true;
        }

        if (!hasError) {
          const options = [optA, optB];
          if (optC) options.push(optC);
          if (optD) options.push(optD);
          const correctIndex = { A: 0, B: 1, C: 2, D: 3 }[correctOpt] ?? 0;

          validRows.push({
            questionText,
            options,
            correctAnswers: [correctIndex],
            marks: marks > 0 ? marks : 1,
            negativeMarks: negMarks >= 0 ? negMarks : 0,
            explanation: explanation || null,
          });
        }
      } else if (type === 'attendance') {
        const rollNumber = String(row.RollNumber || row.rollNumber || '').trim();
        const dateStr = String(row.Date || row.date || '').trim();
        const statusStr = String(row.Status || row.status || 'PRESENT').trim().toUpperCase();
        const remarks = String(row.Remarks || row.remarks || '').trim();

        let hasError = false;

        if (!rollNumber) {
          errors.push({ row: rowNum, column: 'RollNumber', error: 'Missing Roll Number.', suggestedFix: 'Enter student roll number.', rawData: row });
          hasError = true;
        }

        if (!dateStr || isNaN(Date.parse(dateStr))) {
          errors.push({ row: rowNum, column: 'Date', error: 'Invalid Date format.', suggestedFix: 'Use standard YYYY-MM-DD format (e.g. 2026-09-21).', rawData: row });
          hasError = true;
        }

        if (!['PRESENT', 'ABSENT', 'LATE', 'LEAVE'].includes(statusStr)) {
          errors.push({ row: rowNum, column: 'Status', error: `Invalid status "${statusStr}".`, suggestedFix: 'Must be PRESENT, ABSENT, LATE, or LEAVE.', rawData: row });
          hasError = true;
        }

        if (!hasError) {
          validRows.push({
            rollNumber,
            date: new Date(dateStr),
            status: statusStr as AttendanceStatus,
            remarks: remarks || null,
          });
        }
      }
    }

    return {
      totalRows: rows.length,
      validCount: validRows.length,
      invalidCount: errors.length,
      duplicatesCount,
      previewRows: rows.slice(0, 10),
      errors,
      validRows,
    };
  }

  /**
   * Commit validated rows into database with atomic transaction
   */
  static async commit(
    type: 'student' | 'teacher' | 'question' | 'attendance',
    validRows: any[],
    organizationId: string,
    context: { classId?: string; academicYearId?: string; subjectId?: string; authorId?: string }
  ) {
    if (!validRows || validRows.length === 0) {
      throw new Error('No valid records to import.');
    }

    if (type === 'student') {
      if (!context.classId) {
        throw new Error('Target Class ID is required for student enrollment import.');
      }

      const academicClass = await prisma.academicClass.findFirst({
        where: { id: context.classId, organizationId },
        select: { id: true, academicYearId: true },
      });

      if (!academicClass) {
        throw new Error('Target Academic Class not found in organization.');
      }

      const defaultHash = await bcrypt.hash('Student@123', 10);
      const results: any[] = [];

      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          // Find or create User
          let user = await tx.user.findUnique({ where: { email: r.email } });
          if (!user) {
            user = await tx.user.create({
              data: {
                email: r.email,
                fullName: r.fullName,
                phone: r.phone,
                passwordHash: defaultHash,
                role: Role.CANDIDATE,
                organizationId,
                isEmailVerified: false, // Must verify OTP on first login
                isActive: true,
              },
            });
          }

          // Create/update enrollment
          const enrollment = await tx.studentEnrollment.upsert({
            where: {
              classId_rollNumber: {
                classId: academicClass.id,
                rollNumber: r.rollNumber,
              },
            },
            update: {
              prnNumber: r.prnNumber || undefined,
            },
            create: {
              organizationId,
              studentId: user.id,
              classId: academicClass.id,
              academicYearId: academicClass.academicYearId,
              rollNumber: r.rollNumber,
              prnNumber: r.prnNumber,
              status: 'ACTIVE',
            },
          });

          results.push(enrollment);
        }
      });

      return {
        importedCount: results.length,
        message: `Successfully imported and enrolled ${results.length} students.`,
      };
    } else if (type === 'teacher') {
      const defaultHash = await bcrypt.hash('Faculty@123', 10);
      const results: any[] = [];

      await prisma.$transaction(async (tx) => {
        for (const r of validRows) {
          const user = await tx.user.upsert({
            where: { email: r.email },
            update: {
              fullName: r.fullName,
              department: r.department,
              designation: r.designation,
              degree: r.degree,
              phone: r.phone,
              organizationId,
            },
            create: {
              email: r.email,
              fullName: r.fullName,
              department: r.department,
              designation: r.designation,
              degree: r.degree,
              phone: r.phone,
              passwordHash: defaultHash,
              role: Role.TEACHER,
              organizationId,
              isEmailVerified: true,
              isActive: true,
            },
          });
          results.push(user);
        }
      });

      return {
        importedCount: results.length,
        message: `Successfully imported ${results.length} faculty members.`,
      };
    } else if (type === 'question') {
      if (!context.authorId) {
        throw new Error('Author ID is required for question import.');
      }

      const results = await prisma.$transaction(
        validRows.map((q) =>
          prisma.question.create({
            data: {
              organizationId,
              authorId: context.authorId!,
              type: QuestionType.MULTIPLE_CHOICE,
              questionText: q.questionText,
              options: q.options,
              correctAnswers: q.correctAnswers,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              explanation: q.explanation,
            },
          })
        )
      );

      return {
        importedCount: results.length,
        message: `Successfully imported ${results.length} assessment questions.`,
      };
    }

    throw new Error(`Import type ${type} commit handler not configured.`);
  }
}
