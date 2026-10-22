# Test Plan

## Purpose

Verify that EventHub's implemented authentication, event management,
registration, role checks, and deployment behave as expected.

## Test environment

Record the actual environment before testing: - Frontend URL/version: -
Backend URL/version: - Database environment: - Browser: - Test date: -
Tester:

## Test cases

  -----------------------------------------------------------------------
  ID                Scenario          Expected result   Status
  ----------------- ----------------- ----------------- -----------------
  AUTH-01           Register with     Account created   Not run
                    valid details                       

  AUTH-02           Register using an Request rejected  Not run
                    existing email    clearly           

  AUTH-03           Login with valid  Login succeeds    Not run
                    credentials                         

  AUTH-04           Login with        Login rejected    Not run
                    invalid                             
                    credentials                         

  AUTH-05           Access protected  Request rejected  Not run
                    API without token                   

  ROLE-01           Attendee attempts Request rejected  Not run
                    organizer-only                      
                    action                              

  ROLE-02           Non-admin         Request rejected  Not run
                    attempts admin                      
                    action                              

  EVT-01            Browse event list Events returned   Not run

  EVT-02            View an existing  Details returned  Not run
                    event                               

  EVT-03            Submit invalid    Validation error  Not run
                    event data                          

  EVT-04            Unauthorized user Request rejected  Not run
                    edits event                         

  REG-01            Register for      Registration      Not run
                    available event   saved             

  REG-02            Register twice    Duplicate         Not run
                    for same event    rejected          

  REG-03            Register for full Request rejected  Not run
                    event                               

  REG-04            Register after    Request rejected  Not run
                    deadline, if                        
                    enforced                            

  REG-05            View own          Only own          Not run
                    registrations     registrations     
                                      shown             

  REG-06            Cancel            Status updated    Not run
                    registration, if  according to      
                    supported         rules             

  DEP-01            Use core flow on  Flow works in     Not run
                    deployed app      production        
  -----------------------------------------------------------------------

## Reporting defects

For each defect, record: - Test case ID - Steps to reproduce - Expected
result - Actual result - Screenshot/logs, with secrets and personal data
removed - Severity - Fix and retest result

## Exit criteria

Core implemented flows pass; critical authorization and
registration-integrity defects are resolved; deployment has been
smoke-tested. Update this plan to reflect features actually included.
