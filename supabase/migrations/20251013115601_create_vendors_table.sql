/*
  # Create Technology Vendors Table

  1. New Tables
    - `technology_vendors`
      - `id` (uuid, primary key)
      - `vendor_name` (text, vendor name)
      - `category` (text, learning category like "Plan", "Discover", etc.)
      - `technology_type` (text, specific tech type like "LMS", "LXP", etc.)
      - `description` (text, vendor description)
      - `website` (text, vendor website)
      - `is_active` (boolean, whether vendor is still active)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `technology_vendors` table
    - Add policy for public read access
    - Add policy for admin write access

  3. Data
    - Seed with comprehensive list of learning technology vendors
*/

CREATE TABLE IF NOT EXISTS technology_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  category text NOT NULL,
  technology_type text NOT NULL,
  description text DEFAULT '',
  website text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE technology_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendors"
  ON technology_vendors FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage vendors"
  ON technology_vendors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_vendors_category ON technology_vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON technology_vendors(technology_type);
CREATE INDEX IF NOT EXISTS idx_vendors_category_type ON technology_vendors(category, technology_type);

-- Insert comprehensive vendor data for learning technologies

-- Plan Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('Degreed', 'Plan', 'Career Planning', 'Upskilling platform with career pathways', 'https://degreed.com'),
('Fuel50', 'Plan', 'Career Planning', 'Talent mobility and career development', 'https://fuel50.com'),
('Gloat', 'Plan', 'Career Planning', 'Talent marketplace and career development', 'https://gloat.com'),
('EdCast', 'Plan', 'Skills Tracking', 'Skills management and learning experience platform', 'https://edcast.com'),
('Skillsoft Percipio', 'Plan', 'Skills Tracking', 'Skills-focused learning platform', 'https://skillsoft.com'),
('Pluralsight Skills', 'Plan', 'Skills Tracking', 'Technology skills assessment and tracking', 'https://pluralsight.com'),
('ProProfs', 'Plan', 'Assessment', 'Quiz and assessment creation tool', 'https://proprofs.com'),
('Questionmark', 'Plan', 'Assessment', 'Assessment management system', 'https://questionmark.com'),
('ExamSoft', 'Plan', 'Assessment', 'Assessment platform for education', 'https://examsoft.com');

-- Discover Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('Anders Pink', 'Discover', 'Content Curation', 'Content curation and sharing platform', 'https://anderspink.com'),
('Scoop.it', 'Discover', 'Content Curation', 'Content curation tool', 'https://scoop.it'),
('Curata', 'Discover', 'Content Curation', 'Enterprise content curation', 'https://curata.com'),
('PathGather', 'Discover', 'Recommendation', 'Learning content recommendation engine', 'https://pathgather.com'),
('EdCast', 'Discover', 'Recommendation', 'AI-powered content recommendations', 'https://edcast.com'),
('Filtered', 'Discover', 'Recommendation', 'Personalized learning recommendations', 'https://filtered.com');

-- Consume Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('LinkedIn Learning', 'Consume', 'Video Library', 'Professional video learning library', 'https://linkedin.com/learning'),
('Coursera', 'Consume', 'Video Library', 'Online courses and video content', 'https://coursera.org'),
('Udemy Business', 'Consume', 'Video Library', 'Business video course library', 'https://udemy.com/business'),
('Pluralsight', 'Consume', 'Video Library', 'Technology video training library', 'https://pluralsight.com'),
('O''Reilly Learning', 'Consume', 'Content Libraries', 'Books, videos, and live learning', 'https://oreilly.com'),
('Skillsoft', 'Consume', 'Content Libraries', 'Comprehensive learning content library', 'https://skillsoft.com'),
('getAbstract', 'Consume', 'Content Libraries', 'Book summaries and content', 'https://getabstract.com'),
('Grovo', 'Consume', 'Microlearning', 'Microlearning content platform', 'https://grovo.com'),
('Axonify', 'Consume', 'Microlearning', 'Daily microlearning platform', 'https://axonify.com'),
('Qstream', 'Consume', 'Microlearning', 'Microlearning and reinforcement', 'https://qstream.com'),
('Degreed', 'Consume', 'LEP / LXP', 'Learning experience platform', 'https://degreed.com'),
('EdCast', 'Consume', 'LEP / LXP', 'Learning experience platform', 'https://edcast.com'),
('360Learning', 'Consume', 'LEP / LXP', 'Collaborative learning platform', 'https://360learning.com'),
('Cornerstone LXP', 'Consume', 'LEP / LXP', 'Learning experience platform', 'https://cornerstoneondemand.com'),
('Coursera for Business', 'Consume', 'MOOC / Cohort', 'Massive open online courses', 'https://coursera.org'),
('edX for Business', 'Consume', 'MOOC / Cohort', 'University-backed online courses', 'https://edx.org'),
('NovoEd', 'Consume', 'MOOC / Cohort', 'Cohort-based learning platform', 'https://novoed.com'),
('Bunchball', 'Consume', 'Gamification', 'Gamification platform', 'https://bunchball.com'),
('Centrical', 'Consume', 'Gamification', 'Gamified performance platform', 'https://centrical.com'),
('Kahoot!', 'Consume', 'Gamification', 'Game-based learning platform', 'https://kahoot.com');

-- Experiment Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('GoReact', 'Experiment', 'Video Practice', 'Video assessment and feedback tool', 'https://goreact.com'),
('Practicing Excellence', 'Experiment', 'Video Practice', 'Video-based practice platform', 'https://practicingexcellence.com'),
('Strivr', 'Experiment', 'AR/VR', 'Virtual reality training platform', 'https://strivr.com'),
('Immerse', 'Experiment', 'AR/VR', 'VR language learning', 'https://immerse.online'),
('Mursion', 'Experiment', 'AR/VR', 'VR simulation for soft skills', 'https://mursion.com'),
('PIXO VR', 'Experiment', 'AR/VR', 'VR training platform', 'https://pixovr.com'),
('Upwork', 'Experiment', 'Project Marketplace', 'Freelance project marketplace', 'https://upwork.com'),
('Catalant', 'Experiment', 'Project Marketplace', 'Expert project marketplace', 'https://gocatalant.com'),
('Hitch', 'Experiment', 'Project Marketplace', 'Internal project marketplace', 'https://hitch.works');

-- Connect Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('MentorcliQ', 'Connect', 'Mentoring / Coaching', 'Mentoring software platform', 'https://mentorcliq.com'),
('Chronus', 'Connect', 'Mentoring / Coaching', 'Mentoring and networking platform', 'https://chronus.com'),
('Together', 'Connect', 'Mentoring / Coaching', 'Mentoring program software', 'https://togetherplatform.com'),
('BetterUp', 'Connect', 'Mentoring / Coaching', 'Coaching and development platform', 'https://betterup.com'),
('CoachHub', 'Connect', 'Mentoring / Coaching', 'Digital coaching platform', 'https://coachhub.com'),
('Slack', 'Connect', 'Collaborative Learning', 'Team communication and collaboration', 'https://slack.com'),
('Microsoft Teams', 'Connect', 'Collaborative Learning', 'Collaboration platform', 'https://microsoft.com/teams'),
('Miro', 'Connect', 'Collaborative Learning', 'Visual collaboration platform', 'https://miro.com'),
('Mural', 'Connect', 'Collaborative Learning', 'Digital workspace for collaboration', 'https://mural.co'),
('PeopleGrove', 'Connect', 'Expertise Directories', 'Networking and mentoring platform', 'https://peoplegrove.com'),
('Wisr', 'Connect', 'Expertise Directories', 'Peer-to-peer learning platform', 'https://wisr.io'),
('Microsoft Viva Topics', 'Connect', 'Expertise Directories', 'AI-powered knowledge and expertise', 'https://microsoft.com/viva');

-- Perform Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('Workday Learning', 'Perform', 'Performance Tracking', 'Learning integrated with HR', 'https://workday.com'),
('SuccessFactors Learning', 'Perform', 'Performance Tracking', 'SAP learning and performance', 'https://successfactors.com'),
('Lessonly', 'Perform', 'Enablement', 'Sales and customer enablement', 'https://lessonly.com'),
('Seismic Learning', 'Perform', 'Enablement', 'Sales enablement platform', 'https://seismic.com'),
('Highspot', 'Perform', 'Enablement', 'Sales enablement and training', 'https://highspot.com'),
('MindTickle', 'Perform', 'Enablement', 'Sales readiness platform', 'https://mindtickle.com'),
('Credly', 'Perform', 'Certification', 'Digital credentialing platform', 'https://credly.com'),
('Accredible', 'Perform', 'Certification', 'Digital credentials and certificates', 'https://accredible.com'),
('BadgeCert', 'Perform', 'Certification', 'Digital badge platform', 'https://badgecert.com'),
('Confluence', 'Perform', 'Knowledge Repositories', 'Team knowledge management', 'https://atlassian.com/confluence'),
('Notion', 'Perform', 'Knowledge Repositories', 'Connected workspace for knowledge', 'https://notion.so'),
('Guru', 'Perform', 'Knowledge Repositories', 'Knowledge management platform', 'https://getguru.com'),
('Bloomfire', 'Perform', 'Knowledge Repositories', 'Knowledge sharing platform', 'https://bloomfire.com');

-- Manage & Create Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('Workday Learning', 'Manage & Create', 'Back Office Training Mgt', 'Training management system', 'https://workday.com'),
('SuccessFactors', 'Manage & Create', 'Back Office Training Mgt', 'Training administration', 'https://successfactors.com'),
('Oracle Learning Cloud', 'Manage & Create', 'Back Office Training Mgt', 'Learning management system', 'https://oracle.com'),
('Cornerstone OnDemand', 'Manage & Create', 'LMS', 'Learning management system', 'https://cornerstoneondemand.com'),
('Docebo', 'Manage & Create', 'LMS', 'AI-powered learning platform', 'https://docebo.com'),
('TalentLMS', 'Manage & Create', 'LMS', 'Cloud-based LMS', 'https://talentlms.com'),
('Absorb LMS', 'Manage & Create', 'LMS', 'Learning management system', 'https://absorblms.com'),
('Moodle', 'Manage & Create', 'LMS', 'Open-source learning platform', 'https://moodle.org'),
('Canvas', 'Manage & Create', 'LMS', 'Learning management system', 'https://instructure.com/canvas'),
('Blackboard Learn', 'Manage & Create', 'LMS', 'Learning management system', 'https://blackboard.com'),
('SAP Litmos', 'Manage & Create', 'LMS', 'Training and learning platform', 'https://litmos.com'),
('Adobe Captivate Prime', 'Manage & Create', 'LCMS', 'Learning content management', 'https://adobe.com/captivate-prime'),
('Thought Industries', 'Manage & Create', 'LCMS', 'Learning commerce platform', 'https://thoughtindustries.com'),
('Articulate 360', 'Manage & Create', 'Content Creation', 'E-learning authoring suite', 'https://articulate.com'),
('Adobe Captivate', 'Manage & Create', 'Content Creation', 'E-learning authoring tool', 'https://adobe.com/captivate'),
('Camtasia', 'Manage & Create', 'Content Creation', 'Video creation software', 'https://techsmith.com/camtasia'),
('Vyond', 'Manage & Create', 'Content Creation', 'Animated video creation', 'https://vyond.com'),
('Elucidat', 'Manage & Create', 'Content Creation', 'E-learning authoring platform', 'https://elucidat.com'),
('Lectora', 'Manage & Create', 'Content Creation', 'E-learning authoring tool', 'https://lectora.com'),
('iSpring Suite', 'Manage & Create', 'Content Creation', 'PowerPoint-based authoring', 'https://ispringsolutions.com'),
('Totara', 'Manage & Create', 'Extended Enterprise', 'Extended enterprise learning', 'https://totaralearning.com'),
('Learning Pool', 'Manage & Create', 'Extended Enterprise', 'Partner training platform', 'https://learningpool.com');

-- Analyze Category Vendors
INSERT INTO technology_vendors (vendor_name, category, technology_type, description, website) VALUES
('Learning Locker', 'Analyze', 'LRS', 'Learning record store', 'https://learningpool.com/learning-locker'),
('Veracity Learning', 'Analyze', 'LRS', 'xAPI learning record store', 'https://www.veracitylearning.com'),
('Watershed LRS', 'Analyze', 'LRS', 'Learning analytics platform', 'https://watershedlrs.com'),
('Domo', 'Analyze', 'Analytics', 'Business intelligence platform', 'https://domo.com'),
('Tableau', 'Analyze', 'Analytics', 'Data visualization and analytics', 'https://tableau.com'),
('Power BI', 'Analyze', 'Analytics', 'Microsoft business analytics', 'https://powerbi.microsoft.com'),
('Visier', 'Analyze', 'Analytics', 'People analytics platform', 'https://visier.com'),
('SurveyMonkey', 'Analyze', 'Surveys & Evaluations', 'Survey creation platform', 'https://surveymonkey.com'),
('Qualtrics', 'Analyze', 'Surveys & Evaluations', 'Experience management platform', 'https://qualtrics.com'),
('Typeform', 'Analyze', 'Surveys & Evaluations', 'Interactive forms and surveys', 'https://typeform.com'),
('Google Forms', 'Analyze', 'Surveys & Evaluations', 'Free survey tool', 'https://google.com/forms'),
('Culture Amp', 'Analyze', 'Surveys & Evaluations', 'Employee feedback platform', 'https://cultureamp.com');