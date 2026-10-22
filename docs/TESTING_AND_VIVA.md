# Testing and Viva Preparation

## Suggested manual test cases

  -----------------------------------------------------------------------
  Area                    Test                    Expected result
  ----------------------- ----------------------- -----------------------
  Authentication          Register with valid     Account is created
                          details                 

  Authentication          Register with an email  Request is rejected
                          already used            with a clear message

  Authentication          Log in with valid       Login succeeds
                          credentials             

  Authentication          Log in with invalid     Login is rejected
                          credentials             

  Authorization           Call a protected        Request is rejected
                          endpoint without        
                          authentication          

  Authorization           Attendee attempts an    Request is rejected
                          organizer-only action   

  Events                  Browse events           Event list is returned

  Events                  Open an existing event  Event details are
                                                  returned

  Events                  Submit invalid event    Validation error is
                          data                    returned

  Events                  Unauthorized user       Request is rejected
                          attempts to edit an     
                          event                   

  Registration            Register for an open    Registration is saved
                          event with available    
                          capacity                

  Registration            Register for the same   Duplicate is rejected
                          event twice             

  Registration            Register after capacity Registration is
                          is reached              rejected

  Registration            Register after a        Registration is
                          deadline, if enforced   rejected

  Registration            View own registrations  Only the user's
                                                  registrations are shown

  Admin                   Non-admin attempts an   Request is rejected
                          admin action            

  Deployment              Open the deployed app   Core flows work in
                          and use core flows      production
  -----------------------------------------------------------------------

Update these test cases to match the features actually implemented.

## Viva questions to prepare

### MERN and architecture

1.  What does MERN stand for?
2.  Why use React for the frontend?
3.  What is Node.js?
4.  What does Express.js do?
5.  What is MongoDB?
6.  What is Mongoose?
7.  How does React communicate with the Express backend?
8.  What is a REST API?

### Authentication and security

9.  What is authentication?
10. How is authorization different from authentication?
11. What is JWT used for in this project?
12. Why should passwords be hashed?
13. What is bcrypt?
14. What is middleware?
15. How are protected routes handled?
16. Why must role checks happen on the backend?

### Data and registration

17. What information is stored in a User document?
18. What information is stored in an Event document?
19. Why is a separate Registration model useful?
20. How are users, events, and registrations related?
21. How does the application prevent duplicate registrations?
22. How does the backend enforce event capacity?
23. What happens when a user cancels a registration?
24. How could QR-based attendance work if implemented?

### Project decisions

25. Why is EventHub general-purpose rather than college-only?
26. Which features were learned from the tutorial?
27. What customizations distinguish EventHub from the tutorial?
28. What challenges did you encounter and how did you solve them?
29. What would you improve in a future version?
30. Which features are completed, and which remain future scope?

## Viva preparation rule

Answer based on the actual code and tested behavior. Do not claim that a
planned feature is implemented unless it works in the submitted
application.
