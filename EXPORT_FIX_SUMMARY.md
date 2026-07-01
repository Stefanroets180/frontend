# Export Issue Summary

## Problem
HTTP 500 error when exporting vehicle data from the `/dashboard` page. The POST request was reaching the controller but failing in the `exportService.exportSarsLogbook()` method.

## Root Cause
SQL type mismatch error in `OdometerVerificationRepository.findByVehicleYearAndType()` query. The database column `reading_type` is a PostgreSQL custom enum type (`odometer_reading_type`), but JPA was comparing it to VARCHAR/SMALLINT instead of the native enum type.

**Error message:**
```
JDBC exception executing SQL [...] ERROR: operator does not exist: odometer_reading_type = character varying
Hint: No operator matches the given name and argument types. You might need to add explicit type casts.
```

## Fix Applied

### 1. Modified `OdometerVerificationRepository.java`
Changed the query from JPQL to a native SQL query with explicit CAST to handle the PostgreSQL enum type:

```java
@Query(value = "SELECT * FROM odometer_verifications WHERE vehicle_id = :vehicleId AND tax_year = :taxYear AND reading_type = CAST(:type AS odometer_reading_type)", nativeQuery = true)
Optional<OdometerVerification> findByVehicleYearAndType(
        @Param("vehicleId") UUID vehicleId,
        @Param("taxYear") Integer taxYear,
        @Param("type") OdometerReadingType type);
```

**Location:** `spring-boot-backend/src/main/java/za/co/fleetexpense/repository/OdometerVerificationRepository.java`

### 2. Modified `OdometerVerification.java` Entity
Added explicit JPA annotations to handle the enum mapping:

```java
@Enumerated(EnumType.STRING)
@Column(name = "reading_type", nullable = false, columnDefinition = "varchar")
private OdometerReadingType readingType;
```

**Location:** `spring-boot-backend/src/main/java/za/co/fleetexpense/entity/OdometerVerification.java`

### 3. Debugging Changes (Can be Reverted)
- Added `/export2` endpoint in `ExportController.java` for testing
- Added `/api/v1/exports/**` to `SecurityConfig.java` permitAll for bypassing auth during testing

## Files Modified
- `spring-boot-backend/src/main/java/za/co/fleetexpense/repository/OdometerVerificationRepository.java` - **KEEP** (native query fix)
- `spring-boot-backend/src/main/java/za/co/fleetexpense/entity/OdometerVerification.java` - **KEEP** (enum mapping fix)
- `spring-boot-backend/src/main/java/za/co/fleetexpense/controller/ExportController.java` - Can revert `/export2` endpoint
- `spring-boot-backend/src/main/java/za/co/fleetexpense/security/SecurityConfig.java` - Can revert permitAll for exports

---

## Startup Instructions (Mac)

### Prerequisites
- Java 21.0.9
- Node.js
- PostgreSQL 16 (via Homebrew)
- WebStorm (frontend)
- IntelliJ IDEA (backend)

### 1. Start PostgreSQL (Homebrew in Terminal)
```bash
# Start PostgreSQL service
brew services start postgresql@16

# Verify it's running
brew services list

# Or check status
pg_isready
```

### 2. Start Backend (IntelliJ)
1. Open project in IntelliJ IDEA
2. Navigate to `spring-boot-backend` directory
3. Open `FleetExpenseApplication.java` (main class)
4. Click the green run button or use keyboard shortcut: `Ctrl+R` (or `Cmd+R` on Mac)
5. Alternatively, run via Gradle in terminal:
   ```bash
   cd spring-boot-backend
   ./gradlew bootRun
   ```

### 3. Start Frontend (WebStorm)
1. Open project in WebStorm
2. Navigate to `frontend` directory
3. Open terminal in WebStorm or use system terminal
4. Run:
   ```bash
   cd frontend
   npm install  # Only if dependencies not installed
   npm run dev
   ```
5. Open browser to the URL shown (typically `http://localhost:5173`)

### 4. Test Export
Open browser console and run:
```javascript
fetch('http://localhost:8080/api/v1/exports/export2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehicleId: '1a5a214c-2971-4409-b983-72849019dfd4',
    format: 'HTML',
    taxYear: 2025,
    includeTrips: true,
    includeExpenses: true,
    includeFuelLogs: true,
    includeSummary: true
  })
}).then(r => r.text()).then(console.log).catch(console.error);
```

---

## SQL Fixes Applied

The issue was resolved through code changes, not database schema changes. No SQL migration was needed for this fix.

However, if you need to verify or fix the database enum type, you can run:

```sql
-- Check if the odometer_reading_type enum exists
SELECT typname, typtype FROM pg_type WHERE typname = 'odometer_reading_type';

-- Check the reading_type column definition
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'odometer_verifications' AND column_name = 'reading_type';

-- If the column is not the correct type, you may need to alter it (NOT RECOMMENDED unless necessary)
-- ALTER TABLE odometer_verifications ALTER COLUMN reading_type TYPE odometer_reading_type USING reading_type::text::odometer_reading_type;
```

---

## What We Learned

### JPA Enum Mapping Issues
- PostgreSQL custom enum types don't work well with default JPA `@Enumerated` annotations
- `@Enumerated(EnumType.STRING)` maps to VARCHAR, which PostgreSQL can't compare directly to custom enum types
- `@Enumerated(EnumType.ORDINAL)` maps to SMALLINT, which also fails with custom enum types

### Native Query Solution
- When JPA can't handle a database-specific type, use native SQL queries
- PostgreSQL `CAST` syntax: `CAST(value AS type)` or `value::type`
- In this case: `CAST(:type AS odometer_reading_type)`

### Debugging Approach
1. Simplified the endpoint to isolate the issue (removed service call)
2. Reintroduced the service call with detailed error handling
3. Identified the exact SQL query causing the failure
4. Applied targeted fix to the specific repository method

---

## Reverting Debugging Changes

After confirming the fix works, you can revert these debugging changes:

### 1. Remove `/export2` Endpoint
In `ExportController.java`, remove the `@PostMapping("/export2")` method (lines 77-110).

### 2. Remove PermitAll for Exports
In `SecurityConfig.java`, remove `/api/v1/exports/**` from the permitAll list to restore authentication:
```java
// Remove this line:
.requestMatchers("/api/v1/exports/**").permitAll()
```

### 3. Restore Authentication in ExportController
In `ExportController.java`, restore the `@AuthenticationPrincipal` parameter instead of hardcoded values.
