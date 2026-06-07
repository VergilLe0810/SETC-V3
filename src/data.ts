/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, CourseSession, Classroom } from './types';

export const CLASSROOMS: Classroom[] = [
  { id: 'room-101', name: 'Main Safety Lab (Room 101)', capacity: 25, building: 'Block A (Safety HQ)' },
  { id: 'room-102', name: 'Environmental Physics Room 102', capacity: 20, building: 'Block A (Safety HQ)' },
  { id: 'room-ex', name: 'Practical Fire Simulation Ground', capacity: 30, building: 'Outdoor Yard' },
  { id: 'room-conf', name: 'Industrial Mock Confined Tank Room', capacity: 15, building: 'Training Annex' },
  { id: 'room-eco', name: 'Eco-System Analysis Lab B', capacity: 20, building: 'Block B (Eco Labs)' },
];

export const INSTRUCTORS: string[] = [
  'Dr. Elena Rostova (Environmental Compliance Expert)',
  'Chief James McCallister (Rescue Operations Officer)',
  'Sarah Jenkins (OSHA Authorized Trainer)',
  'David Vance (Chemical Hazards Analyst)',
  'Marcus Aureli (Industrial Health Consultant)',
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    code: 'OSHA-30',
    title: 'OSHA 30-Hour General Industry Certification',
    category: 'Safety',
    level: 'Intermediate',
    domain: 'HSE',
    description: 'Comprehensive safety program designed for safety directors, foremen, and field supervisors. Provides training on direct hazards identification, avoidance, and control.',
    certificationEarned: 'OSHA 30-Hour General Industry Card & Site Safety Supervisor Certificate',
    syllabus: [
      'Introduction to OSHA Standards and Compliance Directives',
      'Walking and Working Surfaces, Guarding Openings & Fall Protection',
      'Exit Routes, Emergency Action Plans, and Fire Prevention Systems',
      'Electrical Hazard Safety and Arc Flash (NFPA 70E) Basics',
      'Personal Protective Equipment (PPE) Selection, Audits and Usage',
      'Material Handling, Heavy Machinery Safety & Ergonomics',
      'Hazard Communication, SDS Sheets, and Chemical Storage'
    ],
    durationDays: 5,
    quizQuestions: [
      {
        id: 'q1-1',
        question: 'Under OSHA guidelines, what is the maximum height of an unguarded platform before fall protection is required in general industry?',
        options: ['4 feet', '6 feet', '8 feet', '10 feet'],
        correctAnswerIndex: 0
      },
      {
        id: 'q1-2',
        question: 'Which of the following is NOT a mandatory component of a Hazard Communication program?',
        options: ['Safety Data Sheets (SDS)', 'Labeling chemical containers', 'Installing solar panels in storage labs', 'Employee information and training'],
        correctAnswerIndex: 2
      },
      {
        id: 'q1-3',
        question: 'What color is standard for warning labels indicating high risk electrocution hazards?',
        options: ['Blue', 'Purple', 'Orange/Red', 'Dark Green'],
        correctAnswerIndex: 2
      }
    ]
  },
  {
    id: 'c2',
    code: 'HAZWOPER-40',
    title: 'HAZWOPER 40-Hour Emergency Response Specialist',
    category: 'Environment',
    level: 'Advanced',
    domain: 'HSE',
    description: 'Highly rigorous training for environmental remediation crews, emergency responders, and personnel handling hazardous waste operations at uncontaminated or spill sites.',
    certificationEarned: '40-Hour Hazardous Waste Operations & Emergency Response Certificate',
    syllabus: [
      'Regulatory Framework: CERCLA, RCRA, SARA & OSHA regulations',
      'Toxicology Principles, Threshold Limit Values & Chemical Permeation',
      'Site Characterization, Zoning (Hot, Warm, Cold zones), and Coordination',
      'Air Quality Monitoring Instruments: Photoionization & PID operation',
      'Levels of Personal Protective Clothing (Level A, B, C, D protection)',
      'Decontamination Line Construction and Runoff Management',
      'Spill Control Equipment, Absorption Barriers and Hazardous Mitigation'
    ],
    durationDays: 5,
    quizQuestions: [
      {
        id: 'q2-1',
        question: 'Which level of PPE provides the highest level of respiratory and skin protection?',
        options: ['Level D', 'Level C', 'Level B', 'Level A'],
        correctAnswerIndex: 3
      },
      {
        id: 'q2-2',
        question: 'What do the Hot, Warm, and Cold Zones represent on a hazardous waste site?',
        options: [
          'The temperatures of chemical storage boilers',
          'Levels of contamination risk and standard operational limits',
          'Breakfast, Lunch, and Dinner regions for crews',
          'None of the above'
        ],
        correctAnswerIndex: 1
      },
      {
        id: 'q2-3',
        question: 'Which chemical agent is most commonly monitored with standard portable PIDs in toxic spill zones?',
        options: ['Water Vapor', 'Volatile Organic Compounds (VOCs)', 'Pure Nitrogen gas', 'Helium'],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    id: 'c3',
    code: 'CONF-SPACE',
    title: 'Confined Space Entry & Rescue Operations',
    category: 'Emergency',
    level: 'Advanced',
    domain: 'OPITO/GWO',
    description: 'Practical certification enabling technicians to plan and execute entry permits, air monitoring, attendant duties, and non-entry/entry technical rescues in confined setups.',
    certificationEarned: 'Confined Space Competent Person & Emergency Specialist Certificate',
    syllabus: [
      'Defining Permit-Required Confined Spaces (PRCS)',
      'Atmospheric Hazards Monitoring (Oxygen enrichment/deficiency, LEL limits)',
      'Ventilation Strategies: Positive pressure vs forced axial blowers',
      'The Confined Space Entry Permit (Roles of Entrant, Attendant, Supervisor)',
      'Safety Lockout and Energy Isolation (LOTO) for internal equipment',
      'Rescue Equipment: Tripods, mechanical winches, harnesses & SCBAs',
      'Mock Rescue Drills from Horizontal and Vertical vessels'
    ],
    durationDays: 3,
    quizQuestions: [
      {
        id: 'q3-1',
        question: 'What is the safe range of oxygen concentration allowed for safe entry into a confined space?',
        options: ['Under 16%', 'Exactly 18.0%', 'Between 19.5% and 23.5%', 'Above 25%'],
        correctAnswerIndex: 2
      },
      {
        id: 'q3-2',
        question: 'What is the primary role of the Confined Space Attendant?',
        options: [
          'To enter the space and carry tools',
          'To monitor the environment from outside and coordinate emergency rescue help',
          'To sign off on company payroll lists',
          'To operate the plant boilers'
        ],
        correctAnswerIndex: 1
      },
      {
        id: 'q3-3',
        question: 'When calibrating a gas monitor for confined space entry, what gas is typically used for LEL (Lower Explosive Limit) bump testing?',
        options: ['Oxygen', 'Methane or Pentane', 'Carbon Dioxide', 'Argon'],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    id: 'c4',
    code: 'ISO-14001',
    title: 'ISO 14001:2015 Environmental System Auditing',
    category: 'Compliance',
    level: 'Advanced',
    domain: 'Decree',
    description: 'Rigorous auditor level certification teaching standard practices for implementing and evaluating an ISO 14001 compliant Environmental Management System (EMS).',
    certificationEarned: 'ISO 14001:2015 Certified Senior Environmental Auditor Credential',
    syllabus: [
      'High-Level Structure (HLS) and EMS Clause breakdowns',
      'Identifying Environmental Aspects, Impacts, and Significant Aspect scoring',
      'Compliance Obligations, Statutory Laws, and Stakeholder interests',
      'Life-Cycle Perspective & Sustainable Sourcing Integration',
      'Audit Principles: Organizing checklists, interviews, and audits trails',
      'Writing Corrective Action Requests (CARs) and Lead Management Review'
    ],
    durationDays: 4,
    quizQuestions: [
      {
        id: 'q4-1',
        question: 'True or False: ISO 14001 requires companies to completely eliminate all environmental waste immediately.',
        options: ['True', 'False - It requires a structured system for continuous environmental improvement and compliance tracking'],
        correctAnswerIndex: 1
      },
      {
        id: 'q4-2',
        question: 'In ISO 14001 terms, what is the difference between an environmental "aspect" and "impact"?',
        options: [
          'An aspect is an element of activity; an impact is the resulting change to the environment',
          'An aspect is standard paperwork; an impact refers to physical machinery crash incidents',
          'An aspect exists only on paper, and an impact holds true outdoors',
          'None of the above'
        ],
        correctAnswerIndex: 0
      },
      {
        id: 'q4-3',
        question: 'What cycle is the foundation of the ISO environmental management standard?',
        options: ['The Carbon Recycle', 'The Water Cycle', 'PDCA (Plan-Do-Check-Act)', 'The Product Lifecycle'],
        correctAnswerIndex: 2
      }
    ]
  },
  {
    id: 'c5',
    code: 'CHEM-SPILL',
    title: 'Chemical Spill Response & Industrial Containment',
    category: 'Environment',
    level: 'Intermediate',
    domain: 'HSE',
    description: 'Syllabus designed for facility chemical handlers and hazardous materials crew to deploy secondary containment, chemical absorption kits, neutralizers, and emergency isolations.',
    certificationEarned: 'Chemical Spill On-Scene Incident responder Diploma',
    syllabus: [
      'Chemical Classifications: Corrosives, Oxidizers, Pyrophorics & Flammables',
      'Sourcing Safety Data Sheets (SDS) in real-time accidents',
      'Spill Assessment: Determining volume, hazard profile, and direction',
      'Absorbents: Clay, pads, socks, pillows and specialized dry neutralizers',
      'Containment techniques: Dyking, plugging drains & covering manholes',
      'Decontamination steps for equipment, responders and incident reporting'
    ],
    durationDays: 2,
    quizQuestions: [
      {
        id: 'q5-1',
        question: 'When dealing with a chemical leak of an unknown highly acidic fluid, what neutralizer is safest to use?',
        options: ['Concentrated sulfuric acid', 'Mild Sodium Bicarbonate or specialized buffer', 'Pure gasoline', 'Boiling water'],
        correctAnswerIndex: 1
      },
      {
        id: 'q5-2',
        question: 'What is the first step in active on-scene chemical spill response?',
        options: ['Start sweeping are with dry vacuums', 'Evacuate, sound regional alarm, and assess the chemical identity securely before entry', 'Roll barrels into nearby streams', 'Wipe floors directly with standard cotton rags'],
        correctAnswerIndex: 1
      }
    ]
  },
  {
    id: 'c6',
    code: 'FIRST-AID',
    title: 'Industrial First Aid, CPR & AED Compliance',
    category: 'Health',
    level: 'Basic',
    domain: 'OPITO/GWO',
    description: 'Basic certification for factory floor safety marshals and first-aiders, focusing on life saving interventions, bandage applications, cardiac arrest steps, and burn care.',
    certificationEarned: 'NSC First Aid, Adult/Child CPR, and Automated External Defibrillator License',
    syllabus: [
      'Scene Safety Assessment and Body Substance Isolation (BSI)',
      'Primary Assessment: Airway, Breathing, and Severe Bleeding checks',
      'Cardiopulmonary Resuscitation (CPR) & proper compression depths',
      'How to mount and operate an Automated External Defibrillator (AED)',
      'Treating shock, thermal burns, chemical burns, and deep flesh lacerations',
      'Sustained immobilization for skeletal fractures and spinal precautions'
    ],
    durationDays: 2,
    quizQuestions: [
      {
        id: 'q6-1',
        question: 'What is the correct depth of chest compressions for an adult CPR procedure?',
        options: ['At least 1 inch', 'Between 2 inches and 2.4 inches', 'Directly touching the spinal cord', 'Under 0.5 inch'],
        correctAnswerIndex: 1
      },
      {
        id: 'q6-2',
        question: 'When utilizing an AED, what is the first action to perform when opening the unit?',
        options: ['Slap the electrode pads on immediately', 'Turn ON the AED unit power and follow verbal instruction prompts', 'Pour water over the electrical node', 'Begin shaving patient scalp'],
        correctAnswerIndex: 1
      }
    ]
  }
];

export const INITIAL_SESSIONS: CourseSession[] = [];

// Helper functions for parsing session states relative to simulated current time (June 4, 2026)
export const getSessionStatus = (startStr: string, endStr: string, todayStr = '2026-06-04') => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date(todayStr);

  // Strip hours to compare days
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  if (today >= start && today <= end) {
    return 'ON-GOING';
  } else if (today < start) {
    return 'UP-COMING';
  } else {
    return 'COMPLETED';
  }
};
