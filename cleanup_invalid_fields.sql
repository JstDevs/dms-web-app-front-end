-- Cleanup script for invalid Fields entries
-- This script removes invalid FieldNumber entries (0, > 10) and duplicates

-- Step 1: Show invalid entries before deletion
SELECT 
    LinkID, 
    FieldNumber, 
    Active, 
    FieldID, 
    Description, 
    DataType,
    'INVALID: FieldNumber must be 1-10' as Issue
FROM Fields 
WHERE FieldNumber = 0 OR FieldNumber > 10
ORDER BY LinkID, FieldNumber;

-- Step 2: Show duplicate entries (same LinkID + FieldID with different FieldNumbers)
SELECT 
    f1.LinkID,
    f1.FieldNumber as FieldNumber1,
    f2.FieldNumber as FieldNumber2,
    f1.FieldID,
    f1.Description,
    'DUPLICATE: Same FieldID with different FieldNumbers' as Issue
FROM Fields f1
INNER JOIN Fields f2 ON f1.LinkID = f2.LinkID 
    AND f1.FieldID = f2.FieldID 
    AND f1.FieldID > 0
    AND f1.FieldNumber != f2.FieldNumber
WHERE f1.FieldNumber = 0 OR f1.FieldNumber > 10 OR f2.FieldNumber = 0 OR f2.FieldNumber > 10
ORDER BY f1.LinkID, f1.FieldID;

-- Step 3: DELETE invalid FieldNumber entries (0 or > 10)
-- WARNING: Review the results from Step 1 before running this!
DELETE FROM Fields 
WHERE FieldNumber = 0 OR FieldNumber > 10;

-- Step 4: For duplicate FieldID entries, keep the one with valid FieldNumber (1-10), delete others
-- This handles cases where same FieldID has both valid and invalid FieldNumbers
DELETE f1 FROM Fields f1
INNER JOIN Fields f2 ON f1.LinkID = f2.LinkID 
    AND f1.FieldID = f2.FieldID 
    AND f1.FieldID > 0
    AND f1.FieldNumber != f2.FieldNumber
WHERE (f1.FieldNumber = 0 OR f1.FieldNumber > 10)
    AND f2.FieldNumber >= 1 AND f2.FieldNumber <= 10;

-- Step 5: Verify cleanup - should return 0 rows
SELECT 
    LinkID, 
    FieldNumber, 
    Active, 
    FieldID, 
    Description, 
    DataType
FROM Fields 
WHERE FieldNumber = 0 OR FieldNumber > 10
ORDER BY LinkID, FieldNumber;

-- Step 6: Show final state for LinkID 54 (example)
SELECT 
    LinkID, 
    FieldNumber, 
    Active, 
    FieldID, 
    Description, 
    DataType
FROM Fields 
WHERE LinkID = 54
ORDER BY FieldNumber;

