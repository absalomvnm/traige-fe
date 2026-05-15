---

# Triage App – Architecture & Data Model

## Overview
This app is a midwife-led obstetric triage system designed for South African public maternity units. It supports:
- Dynamic patient assessment and triage
- Historical patient file management
- Alerts and audit logging
- Configurable conditions and symptoms

## Key Database Entities
- **User**: Midwives and staff, with professional details
- **Patient**: Demographics and identifiers
- **PatientFile**: Historical record for each patient
- **Assessment**: Each triage event, with vitals, risk factors, status, outcome, etc.
- **Condition**: List of triage conditions (DB-driven)
- **Symptom**: List of symptoms (DB-driven)
- **AssessmentCondition**: Links assessments to selected conditions
- **AssessmentSymptom**: Links assessments to selected symptoms
- **AssessmentAlert**: Alerts generated during assessment (e.g., critical vitals)
- **ManagementChecklist**: Protocol checklist per assessment
- **TimelineEvent**: Timeline/history for each assessment
- **AuditLog**: Logs all user actions/interactions for compliance

## Patient Assessment Flow
1. **Patient details** are captured or selected from history.
2. **Assessment** is performed, including vitals, risk factors, symptoms, and conditions.
3. **Priority** is calculated and protocol checklist is generated.
4. **Alerts** are triggered for critical findings.
5. **Timeline events** are logged for all key actions.
6. **Audit logs** record all user interactions.
7. **All data** builds up the patient’s historical file for future reference.

## Why Store Conditions & Symptoms in the DB?
- Allows dynamic updates without redeploying the frontend
- Supports localization, categorization, and richer metadata
- Keeps the frontend lightweight and data-driven

## UML Diagram
The following diagram shows the main entities and relationships:

## mermaid
classDiagram
    User <|-- Assessment : performs
    Patient <|-- Assessment : has
    Assessment <|-- TimelineEvent : logs
    Assessment <|-- ManagementChecklist : tracks
    Patient <|-- PatientFile : builds
    Condition <|-- AssessmentCondition : links
    Symptom <|-- AssessmentSymptom : links
    Assessment <|-- AssessmentCondition : has
    Assessment <|-- AssessmentSymptom : has
    Assessment <|-- AssessmentAlert : triggers
    Assessment <|-- AuditLog : records
    class User {
        id: UUID
        name: string
        email: string
        role: string
        professional_id: string
    }
    class Patient {
        id: UUID
        name: string
        surname: string
        dob: date
        contact: string
    }
    class PatientFile {
        id: UUID
        patient_id: UUID
        created_at: datetime
        updated_at: datetime
        notes: text
    }
    class Assessment {
        id: UUID
        patient_id: UUID
        user_id: UUID
        created_at: datetime
        priority: int
        status: string
        location: string
        outcome: string
        vitals: json
        risk_factors: json
    }
    class TimelineEvent {
        id: UUID
        assessment_id: UUID
        time: datetime
        title: string
        detail: string
        tone: string
    }
    class ManagementChecklist {
        id: UUID
        assessment_id: UUID
        item: string
        completed: bool
    }
    class Condition {
        id: UUID
        name: string
        description: string
        category: string
        is_active: bool
    }
    class Symptom {
        id: UUID
        name: string
        description: string
        is_active: bool
    }
    class AssessmentCondition {
        id: UUID
        assessment_id: UUID
        condition_id: UUID
    }
    class AssessmentSymptom {
        id: UUID
        assessment_id: UUID
        symptom_id: UUID
    }
    class AssessmentAlert {
        id: UUID
        assessment_id: UUID
        type: string
        priority: int
        message: string
        status: string
        created_at: datetime
        resolved_at: datetime
    }
    class AuditLog {
        id: UUID
        assessment_id: UUID
        user_id: UUID
        action: string
        details: string
        created_at: datetime
    }
```

---

## Exporting the UML Diagram
You can copy the Mermaid code block above and paste it into any Mermaid live editor (e.g., [Mermaid Live Editor](https://mermaid.live/)) or use VS Code extensions like "Markdown Preview Mermaid Support" to view and export the diagram as SVG or PNG.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
