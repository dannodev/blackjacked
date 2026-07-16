GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_items            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_menu           TO authenticated;
GRANT SELECT ON                           public.exercises            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_summary         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streaks               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs    TO authenticated;
GRANT SELECT, INSERT                      ON public.ai_logs          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.squads                TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- SEED EXERCISES (~80 items)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO public.exercises (id, name, category, mets, distance_based) VALUES
-- Cardio
('run','Running','cardio',9.8,true),
('jog','Jogging','cardio',7.0,true),
('cycle','Cycling','cardio',7.5,true),
('walk','Walking','cardio',3.5,false),
('hike','Hiking','cardio',6.0,false),
('swim','Swimming','cardio',8.0,false),
('row','Rowing','cardio',8.5,false),
('jumprope','Jump rope','cardio',12.3,false),
('hiit','HIIT','cardio',10.0,false),
('stairs','Stairs','cardio',8.8,false),
('elliptical','Elliptical','cardio',5.0,false),
('skate','Skating','cardio',7.0,false),
('ski','Cross-country ski','cardio',8.0,false),
('pushbike','Push bike','cardio',5.0,false),
('treadmill','Treadmill walk (incline)','cardio',5.3,false),
('spin','Spin class','cardio',8.5,false),
-- Gym
('squat','Squats','gym',5.0,false),
('deadlift','Deadlift','gym',6.0,false),
('bench','Bench press','gym',5.0,false),
('pullup','Pull-ups','gym',8.0,false),
('pushup','Push-ups','gym',8.0,false),
('ohp','Overhead press','gym',5.0,false),
('lunge','Lunges','gym',5.5,false),
('curl','Bicep curl','gym',3.5,false),
('row_gym','Barbell row','gym',5.0,false),
('legpress','Leg press','gym',5.0,false),
('legcurl','Leg curl','gym',4.0,false),
('legext','Leg extension','gym',4.0,false),
('tricep','Tricep dip','gym',6.0,false),
('latpull','Lat pulldown','gym',4.5,false),
('calfraise','Calf raise','gym',3.5,false),
('hipthrust','Hip thrust','gym',5.0,false),
('kettlebell','Kettlebell swing','gym',9.8,false),
('bulgarian','Bulgarian split squat','gym',5.5,false),
('romanian','Romanian deadlift','gym',5.5,false),
('frontsquat','Front squat','gym',5.5,false),
('inclinebench','Incline bench','gym',5.0,false),
('boxjump','Box jump','gym',7.5,false),
-- Core
('plank','Plank','core',4.0,false),
('crunch','Crunch','core',4.5,false),
('situp','Sit-up','core',4.5,false),
('russian','Russian twist','core',5.0,false),
('mountainclimber','Mountain climber','core',8.0,false),
('legraise','Hanging leg raise','core',5.0,false),
('bicycle','Bicycle crunch','core',5.5,false),
('sideplank','Side plank','core',4.0,false),
('woodchop','Wood chop','core',5.0,false),
('flutterkick','Flutter kick','core',4.5,false),
-- Sports
('basketball','Basketball','sports',6.5,false),
('soccer','Soccer','sports',7.0,false),
('tennis','Tennis','sports',7.3,false),
('pingpong','Table tennis','sports',4.0,false),
('badminton','Badminton','sports',5.5,false),
('climb','Climbing','sports',8.0,false),
('yoga','Yoga','sports',3.0,false),
('pilates','Pilates','sports',3.0,false),
('dance','Dance','sports',5.0,false),
('box','Boxing','sports',9.0,false),
('mma','MMA','sports',10.0,false),
('volleyball','Volleyball','sports',6.0,false),
('surf','Surfing','sports',6.0,false),
('golf','Golf','sports',4.8,false),
('football','Flag football','sports',6.0,false),
('hockey','Hockey','sports',8.0,false),
('martialarts','Martial arts','sports',8.0,false),
-- Daily
('clean','House cleaning','daily',3.3,false),
('garden','Gardening','daily',4.0,false),
('walkdog','Walk the dog','daily',3.5,false),
('desk','Desk work','daily',1.5,false),
('cook','Cooking','daily',2.5,false),
('stand','Standing','daily',1.8,false),
('stretch','Stretching','daily',2.3,false),
('foamroll','Foam rolling','daily',2.5,false),
('meditate','Meditation','daily',1.0,false),
('sauna','Sauna','daily',1.5,false)
ON CONFLICT (id) DO NOTHING;