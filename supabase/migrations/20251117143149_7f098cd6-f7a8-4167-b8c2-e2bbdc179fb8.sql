-- Create topics table for CS subjects
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id),
  num_mcqs INTEGER NOT NULL,
  num_coding INTEGER NOT NULL,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create test_questions table
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  user_answer TEXT,
  is_correct BOOLEAN,
  code_submission TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id),
  tests_taken INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  last_test_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topics (public read)
CREATE POLICY "Topics are viewable by everyone"
  ON public.topics FOR SELECT
  USING (true);

-- RLS Policies for tests (user-specific)
CREATE POLICY "Users can view their own tests"
  ON public.tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tests"
  ON public.tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tests"
  ON public.tests FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for test_questions (user-specific through test)
CREATE POLICY "Users can view their test questions"
  ON public.test_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_questions.test_id
    AND tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can create test questions"
  ON public.test_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_questions.test_id
    AND tests.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their test questions"
  ON public.test_questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_questions.test_id
    AND tests.user_id = auth.uid()
  ));

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert default topics
INSERT INTO public.topics (name, category, description) VALUES
('Data Structures', 'Core CS', 'Arrays, Linked Lists, Trees, Graphs, Hash Tables'),
('Algorithms', 'Core CS', 'Sorting, Searching, Dynamic Programming, Greedy'),
('Object-Oriented Programming', 'Programming', 'Classes, Inheritance, Polymorphism, Encapsulation'),
('Database Management', 'Systems', 'SQL, Normalization, Transactions, Indexing'),
('Operating Systems', 'Systems', 'Processes, Threads, Memory Management, Scheduling'),
('Computer Networks', 'Systems', 'TCP/IP, HTTP, DNS, Network Security'),
('Web Development', 'Programming', 'HTML, CSS, JavaScript, React, APIs'),
('System Design', 'Design', 'Scalability, Load Balancing, Caching, Microservices');