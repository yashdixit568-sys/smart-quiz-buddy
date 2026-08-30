/**
 * Master CS Subjects, Sub-topics, and Rich Fallback Question Bank.
 * Includes clear explanations, difficulty levels, and sub-topic metadata for every question.
 */

export interface SubjectTopicMap {
  subjectId: string;
  subjectName: string;
  category: "Core CS" | "Systems" | "Programming" | "Design";
  description: string;
  topics: string[];
}

export const SUBJECT_TOPICS: SubjectTopicMap[] = [
  {
    subjectId: "ds",
    subjectName: "Data Structures",
    category: "Core CS",
    description: "Arrays, Linked Lists, Trees, Graphs, Hash Tables",
    topics: ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Trees & Graphs", "Hash Tables & Heaps"],
  },
  {
    subjectId: "algo",
    subjectName: "Algorithms",
    category: "Core CS",
    description: "Sorting, Searching, Dynamic Programming, Greedy",
    topics: ["Sorting & Searching", "Dynamic Programming", "Greedy Algorithms", "Recursion & Backtracking"],
  },
  {
    subjectId: "oop",
    subjectName: "Object-Oriented Programming",
    category: "Programming",
    description: "Classes, Inheritance, Polymorphism, Encapsulation",
    topics: ["Encapsulation & Abstraction", "Inheritance & Polymorphism", "Design Patterns", "SOLID Principles"],
  },
  {
    subjectId: "db",
    subjectName: "Database Management",
    category: "Systems",
    description: "SQL, Normalization, Transactions, Indexing",
    topics: ["SQL & Joins", "Normalization (1NF-3NF/BCNF)", "Transactions & ACID", "Indexing & Query Optimization"],
  },
  {
    subjectId: "os",
    subjectName: "Operating Systems",
    category: "Systems",
    description: "Processes, Threads, Memory Management, Scheduling",
    topics: ["Process Scheduling", "Deadlocks & Synchronization", "Memory Management & Paging", "File Systems & Virtual Memory"],
  },
  {
    subjectId: "cn",
    subjectName: "Computer Networks",
    category: "Systems",
    description: "TCP/IP, HTTP, DNS, Network Security",
    topics: ["OSI & TCP/IP Model", "HTTP/HTTPS & Web Protocols", "DNS & Routing", "Sockets & Network Security"],
  },
  {
    subjectId: "web",
    subjectName: "Web Development",
    category: "Programming",
    description: "HTML, CSS, JavaScript, React, APIs",
    topics: ["JavaScript & Async/ES6", "React & Component Lifecycle", "HTML/CSS & DOM Manipulation", "REST APIs & Web Security"],
  },
  {
    subjectId: "sd",
    subjectName: "System Design",
    category: "Design",
    description: "Scalability, Load Balancing, Caching, Microservices",
    topics: ["Scalability & Load Balancing", "Caching & CDNs", "Microservices & Message Queues", "Database Sharding & Replication"],
  },
];

export interface FallbackMCQ {
  question: string;
  options: string[];
  correct: string;
  topic?: string;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface FallbackCoding {
  question: string;
  difficulty: "easy" | "medium" | "hard";
  example_input: string;
  example_output: string;
  constraints: string;
  topic?: string;
  explanation: string;
}

export interface TopicQuestions {
  mcqs: FallbackMCQ[];
  coding: FallbackCoding[];
}

export const FALLBACK_QUESTIONS: Record<string, TopicQuestions> = {
  "Data Structures": {
    mcqs: [
      {
        question: "Which data structure is primarily used to implement an LRU (Least Recently Used) cache for O(1) time complexity operations?",
        options: [
          "Hash Map with a Doubly Linked List",
          "Binary Search Tree with Array",
          "Single Linked List with Stack",
          "Min-Heap with Queue",
        ],
        correct: "A",
        topic: "Hash Tables & Heaps",
        difficulty: "medium",
        explanation: "A Hash Map provides O(1) key lookups, while a Doubly Linked List allows O(1) node removal and insertion at the head for tracking usage order.",
      },
      {
        question: "What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?",
        options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"],
        correct: "C",
        topic: "Trees & Graphs",
        difficulty: "easy",
        explanation: "An unbalanced BST can degenerate into a single linked list (skewed tree) where finding an element requires traversing all n nodes, resulting in O(n) worst-case complexity.",
      },
      {
        question: "Which data structure is best suited for evaluating arithmetic expressions written in postfix (Reverse Polish) notation?",
        options: ["Queue", "Stack", "Priority Queue", "Circular Buffer"],
        correct: "B",
        topic: "Stacks & Queues",
        difficulty: "easy",
        explanation: "A Stack naturally handles postfix expressions by pushing operands and popping the top two values whenever an operator is encountered.",
      },
      {
        question: "In a min-heap with n elements, what is the time complexity of deleting the root (minimum) element?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: "B",
        topic: "Hash Tables & Heaps",
        difficulty: "medium",
        explanation: "Deleting the root requires swapping it with the last leaf and bubbling down (heapifying) along the height of the tree, taking O(log n) operations.",
      },
      {
        question: "What is the amortized time complexity for inserting an element at the end of a dynamic array (like std::vector or ArrayList)?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
        correct: "C",
        topic: "Arrays & Strings",
        difficulty: "easy",
        explanation: "Although resizing takes O(n) time occasionally when capacity doubles, the total work for n insertions is O(n), giving an amortized time of O(1) per insert.",
      },
    ],
    coding: [
      {
        question: "Reverse a Singly Linked List.\n\nGiven the head of a singly linked list, reverse the list, and return the reversed list's head node.",
        difficulty: "easy",
        example_input: "head = [1,2,3,4,5]",
        example_output: "[5,4,3,2,1]",
        constraints: "The number of nodes in the list is in the range [0, 5000]. -5000 <= Node.val <= 5000",
        topic: "Linked Lists",
        explanation: "Iterate through the list while updating current node's next pointer to point to the previous node (prev), using a temporary variable to hold next node reference.",
      },
      {
        question: "Implement a queue using two stacks.\n\nYour queue should support push(), pop(), peek(), and empty() operations with O(1) amortized time complexity.",
        difficulty: "medium",
        example_input: '["MyQueue", "push", "push", "peek", "pop", "empty"]\n[[], [1], [2], [], [], []]',
        example_output: "[null, null, null, 1, 1, false]",
        constraints: "1 <= x <= 100. Maximum of 100 calls will be made to push, pop, peek, and empty.",
        topic: "Stacks & Queues",
        explanation: "Use stack1 for enqueue (push) operations. When dequeue (pop/peek) is requested, transfer elements from stack1 to stack2 if stack2 is empty to reverse the order.",
      },
      {
        question: "Find the Lowest Common Ancestor (LCA) of two given nodes in a Binary Tree.",
        difficulty: "hard",
        example_input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1",
        example_output: "3",
        constraints: "All Node.val are unique. p != q and both p and q will exist in the tree.",
        topic: "Trees & Graphs",
        explanation: "Use recursive post-order traversal. If root matches p or q, return root. If both left and right subtrees return non-null, the current root is the LCA.",
      },
    ],
  },
  Algorithms: {
    mcqs: [
      {
        question: "What is the worst-case time complexity of QuickSort?",
        options: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
        correct: "B",
        topic: "Sorting & Searching",
        difficulty: "easy",
        explanation: "QuickSort exhibits O(n^2) worst-case complexity when the pivot chosen is consistently the smallest or largest element (e.g. already sorted array with bad pivot choice).",
      },
      {
        question: "Dijkstra's shortest path algorithm fails when the graph contains:",
        options: ["Cycles", "Directed edges", "Negative edge weights", "Dense edges"],
        correct: "C",
        topic: "Greedy Algorithms",
        difficulty: "medium",
        explanation: "Dijkstra assumes that adding edges strictly increases path length. Negative weights violate this greedy choice property, leading to incorrect shortest path calculations.",
      },
      {
        question: "Which algorithmic paradigm is used by MergeSort?",
        options: ["Greedy Approach", "Divide and Conquer", "Dynamic Programming", "Backtracking"],
        correct: "B",
        topic: "Sorting & Searching",
        difficulty: "easy",
        explanation: "MergeSort divides the array into two halves, recursively sorts each half, and conquers by merging the two sorted sub-arrays.",
      },
      {
        question: "What is the space complexity of solving the 0/1 Knapsack problem using standard 2D Dynamic Programming?",
        options: ["O(N)", "O(W)", "O(N * W)", "O(2^N)"],
        correct: "C",
        topic: "Dynamic Programming",
        difficulty: "medium",
        explanation: "The traditional DP table uses N rows (items) and W columns (capacity), resulting in O(N * W) space complexity.",
      },
    ],
    coding: [
      {
        question: "Binary Search.\n\nGiven an array of integers nums sorted in ascending order and a target value, write a function to search target in nums in O(log n) time.",
        difficulty: "easy",
        example_input: "nums = [-1,0,3,5,9,12], target = 9",
        example_output: "4",
        constraints: "1 <= nums.length <= 10^4. All elements are unique.",
        topic: "Sorting & Searching",
        explanation: "Maintain two pointers (left and right). Calculate mid = left + (right - left)/2. Adjust search boundaries based on comparison with target.",
      },
      {
        question: "Longest Increasing Subsequence (LIS).\n\nGiven an integer array nums, return the length of the longest strictly increasing subsequence.",
        difficulty: "medium",
        example_input: "nums = [10,9,2,5,3,7,101,18]",
        example_output: "4",
        constraints: "1 <= nums.length <= 2500. -10^4 <= nums[i] <= 10^4",
        topic: "Dynamic Programming",
        explanation: "Can be solved in O(n^2) with DP array where dp[i] is length of LIS ending at index i, or in O(n log n) using patience sorting with binary search.",
      },
    ],
  },
  "Object-Oriented Programming": {
    mcqs: [
      {
        question: "Which OOP concept enables a single method name to exhibit different behaviors based on the object or arguments passed?",
        options: ["Encapsulation", "Polymorphism", "Inheritance", "Abstraction"],
        correct: "B",
        topic: "Inheritance & Polymorphism",
        difficulty: "easy",
        explanation: "Polymorphism ('many forms') allows methods to be overridden (runtime) or overloaded (compile-time) to perform different operations.",
      },
      {
        question: "Which SOLID principle states that softare entities (classes, modules) should be open for extension but closed for modification?",
        options: [
          "Single Responsibility Principle",
          "Open/Closed Principle",
          "Liskov Substitution Principle",
          "Dependency Inversion Principle",
        ],
        correct: "B",
        topic: "SOLID Principles",
        difficulty: "medium",
        explanation: "The Open/Closed Principle (OCP) encourages designing code so new functionality can be added via sub-classing or interfaces without editing existing source code.",
      },
      {
        question: "Which Design Pattern restricts a class to a single instance and provides global access to it?",
        options: ["Factory Method", "Singleton Pattern", "Observer Pattern", "Strategy Pattern"],
        correct: "B",
        topic: "Design Patterns",
        difficulty: "easy",
        explanation: "The Singleton Pattern uses a private constructor and a static instance accessor to ensure only one instance exists across the application runtime.",
      },
    ],
    coding: [
      {
        question: "Design a Bank Account class with encapsulation.\n\nImplement deposit(amount), withdraw(amount), and get_balance() methods with proper input validation.",
        difficulty: "easy",
        example_input: "account = BankAccount(100); account.deposit(50); account.withdraw(30)",
        example_output: "120",
        constraints: "Amounts must be positive. Withdrawals exceeding balance must raise ValueError.",
        topic: "Encapsulation & Abstraction",
        explanation: "Keep balance private (__balance). Validate amount > 0 for deposits/withdrawals and enforce balance checks inside setter/withdraw methods.",
      },
    ],
  },
  "Database Management": {
    mcqs: [
      {
        question: "Which Normal Form removes Partial Functional Dependencies (where a non-prime attribute depends on part of a composite candidate key)?",
        options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
        correct: "B",
        topic: "Normalization (1NF-3NF/BCNF)",
        difficulty: "medium",
        explanation: "Second Normal Form (2NF) ensures that a table is in 1NF and that every non-prime attribute is fully functionally dependent on the entire composite primary key.",
      },
      {
        question: "What does the 'I' in ACID transaction properties stand for?",
        options: ["Integrity", "Isolation", "Indexability", "Immutable"],
        correct: "B",
        topic: "Transactions & ACID",
        difficulty: "easy",
        explanation: "Isolation guarantees that concurrent transactions execute independently without interfering with each other's intermediate uncommitted states.",
      },
      {
        question: "Which SQL clause is used to filter aggregated records after a GROUP BY clause?",
        options: ["WHERE", "HAVING", "ORDER BY", "FILTER"],
        correct: "B",
        topic: "SQL & Joins",
        difficulty: "easy",
        explanation: "WHERE filters rows before grouping, whereas HAVING filters aggregate results (like SUM, COUNT, AVG) after grouping.",
      },
      {
        question: "What type of database index structure is most widely used in RDBMS (e.g. PostgreSQL, MySQL InnoDB) for range queries?",
        options: ["Hash Index", "B+ Tree Index", "LSM Tree", "Inverted Index"],
        correct: "B",
        topic: "Indexing & Query Optimization",
        difficulty: "medium",
        explanation: "B+ Trees maintain sorted key order with data references linked in leaves, offering efficient O(log N) point lookups and sequential range scans.",
      },
    ],
    coding: [
      {
        question: "Write an SQL query to find the Nth highest salary from an Employee table.\n\nSchema: Employee(id INT, salary INT)",
        difficulty: "medium",
        example_input: "Employee table with salaries [100, 200, 300], N = 2",
        example_output: "200",
        constraints: "Return NULL if there are fewer than N distinct salaries.",
        topic: "SQL & Joins",
        explanation: "Use DENSE_RANK() OVER (ORDER BY salary DESC) or SELECT DISTINCT salary ... ORDER BY salary DESC LIMIT 1 OFFSET N-1.",
      },
    ],
  },
  "Operating Systems": {
    mcqs: [
      {
        question: "Which of the following conditions is NOT a necessary requirement for a Deadlock to occur?",
        options: ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
        correct: "C",
        topic: "Deadlocks & Synchronization",
        difficulty: "medium",
        explanation: "The four Coffman deadlock conditions are Mutual Exclusion, Hold & Wait, No Preemption (preemption prevents deadlocks), and Circular Wait.",
      },
      {
        question: "What is Belady's Anomaly in Operating Systems?",
        options: [
          "Increasing page frames leads to more page faults in FIFO replacement",
          "CPU utilization drops when process count increases",
          "Disk thrashing causes thread starvation",
          "Virtual memory exceeds physical RAM limits",
        ],
        correct: "A",
        topic: "Memory Management & Paging",
        difficulty: "medium",
        explanation: "Belady's Anomaly is the counter-intuitive phenomenon where increasing physical page frames increases page faults under FIFO page replacement.",
      },
      {
        question: "Which CPU scheduling algorithm gives minimum average waiting time for a given set of processes?",
        options: ["First-Come First-Served (FCFS)", "Round Robin (RR)", "Shortest Job First (SJF)", "Priority Scheduling"],
        correct: "C",
        topic: "Process Scheduling",
        difficulty: "easy",
        explanation: "Shortest Job First (SJF) is mathematically optimal because executing shorter processes first minimizes total accumulated queue waiting time.",
      },
    ],
    coding: [
      {
        question: "Simulate a Least Recently Used (LRU) Page Replacement algorithm.\n\nGiven capacity and a sequence of page references, return the total count of page faults.",
        difficulty: "medium",
        example_input: "capacity = 3, pages = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]",
        example_output: "10",
        constraints: "1 <= capacity <= 100. 1 <= pages.length <= 1000.",
        topic: "Memory Management & Paging",
        explanation: "Maintain an active cache set and ordered list/map. If page missing, increment page fault count and evict oldest reference if capacity exceeded.",
      },
    ],
  },
  "Computer Networks": {
    mcqs: [
      {
        question: "Which transport layer protocol provides reliable, connection-oriented byte stream transmission with congestion control?",
        options: ["UDP", "IP", "TCP", "ICMP"],
        correct: "C",
        topic: "OSI & TCP/IP Model",
        difficulty: "easy",
        explanation: "TCP uses a three-way handshake, sequence numbers, ACKs, and sliding windows to provide reliable, ordered, flow-controlled data transfer.",
      },
      {
        question: "Which HTTP status code signifies '301 Moved Permanently'?",
        options: ["301", "302", "404", "500"],
        correct: "A",
        topic: "HTTP/HTTPS & Web Protocols",
        difficulty: "easy",
        explanation: "301 indicates a permanent URL redirect, directing search engines to update their indexed link to the new Location header target.",
      },
      {
        question: "In the OSI model, at which layer does encryption/decryption (TLS/SSL) primarily operate?",
        options: ["Transport Layer", "Presentation Layer", "Network Layer", "Session Layer"],
        correct: "B",
        topic: "OSI & TCP/IP Model",
        difficulty: "medium",
        explanation: "Layer 6 (Presentation Layer) handles data formatting, compression, and cryptography/encryption before handover to application level.",
      },
    ],
    coding: [
      {
        question: "Validate an IPv4 / IPv6 Address string.\n\nReturn 'IPv4' if valid IPv4, 'IPv6' if valid IPv6, or 'Neither' if invalid.",
        difficulty: "medium",
        example_input: 'queryIP = "172.16.254.1"',
        example_output: '"IPv4"',
        constraints: "queryIP consists of English letters, digits, and special characters '.' and ':'.",
        topic: "Sockets & Network Security",
        explanation: "For IPv4, split by '.', check 4 blocks in range 0-255 with no leading zeros. For IPv6, split by ':', check 8 blocks of 1-4 hex digits.",
      },
    ],
  },
  "Web Development": {
    mcqs: [
      {
        question: "What is the primary difference between `localStorage` and `sessionStorage` in modern web browsers?",
        options: [
          "localStorage data persists until explicitly cleared; sessionStorage data expires when the tab closes",
          "localStorage can store objects; sessionStorage can only store numbers",
          "sessionStorage has a 50MB limit while localStorage has 5MB",
          "localStorage is only available on HTTPS domains",
        ],
        correct: "A",
        topic: "JavaScript & Async/ES6",
        difficulty: "easy",
        explanation: "localStorage persists across browser restarts until manually deleted. sessionStorage is bound to the current tab session lifecycle.",
      },
      {
        question: "What is Cross-Site Scripting (XSS)?",
        options: [
          "An attack where unauthorized scripts are injected and executed in trusted web browsers",
          "A server forgery attack using forged HTTP cookies",
          "A SQL database query manipulation technique",
          "A DNS spoofing attack redirecting IP addresses",
        ],
        correct: "A",
        topic: "REST APIs & Web Security",
        difficulty: "medium",
        explanation: "XSS occurs when malicious scripts are injected into untrusted input fields and rendered into legitimate web pages, hijacking user sessions or cookies.",
      },
      {
        question: "In React, what hook is used to perform side effects (data fetching, subscriptions, DOM mutations)?",
        options: ["useState", "useEffect", "useMemo", "useCallback"],
        correct: "B",
        topic: "React & Component Lifecycle",
        difficulty: "easy",
        explanation: "useEffect handles side effects after component render cycles. Its dependency array controls when the effect re-runs.",
      },
    ],
    coding: [
      {
        question: "Implement a Debounce Utility Function.\n\nCreate a function `debounce(fn, delay)` that delays executing `fn` until `delay` milliseconds have elapsed since last call.",
        difficulty: "medium",
        example_input: "fn = () => console.log('clicked'), delay = 300ms",
        example_output: "Function executes once after 300ms inactivity",
        constraints: "Must cancel previous timer on rapid invocation.",
        topic: "JavaScript & Async/ES6",
        explanation: "Return a wrapper function holding a timer variable in closure. Clear previous timer using clearTimeout(timer) and reset setTimeout.",
      },
    ],
  },
  "System Design": {
    mcqs: [
      {
        question: "Which strategy is used to evenly distribute key-value pairs across dynamic nodes in a distributed cache (like Memcached/Cassandra) during resizes?",
        options: ["Round Robin", "Consistent Hashing", "Least Connections", "Master-Slave Replication"],
        correct: "B",
        topic: "Caching & CDNs",
        difficulty: "medium",
        explanation: "Consistent Hashing maps both keys and servers to a virtual ring, ensuring that adding or removing a node re-maps only K/N keys instead of reshuffling all keys.",
      },
      {
        question: "According to the CAP Theorem, a distributed system can guarantee at most two of which three properties simultaneously?",
        options: [
          "Consistency, Availability, Partition Tolerance",
          "Concurrency, Authentication, Performance",
          "Capacity, Availability, Persistence",
          "Cacheability, Atomicity, Partitioning",
        ],
        correct: "A",
        topic: "Scalability & Load Balancing",
        difficulty: "easy",
        explanation: "CAP Theorem proves that in the presence of a network Partition (P), a distributed data store must choose between Consistency (C) or Availability (A).",
      },
      {
        question: "What is the primary benefit of deploying a CDN (Content Delivery Network)?",
        options: [
          "Decreases database write locks",
          "Serves static assets from edge locations close to users to minimize latency",
          "Encrypted database backup replication",
          "Automatically executes SQL queries faster",
        ],
        correct: "B",
        topic: "Caching & CDNs",
        difficulty: "easy",
        explanation: "CDNs cache static assets (images, CSS, JS, videos) on distributed edge proxy servers globally, shortening physical round-trip distance (RTT) to end users.",
      },
    ],
    coding: [
      {
        question: "Design a Rate Limiter using the Sliding Window Counter algorithm.\n\nImplement isAllowed(userId, timestamp) allowing max 5 requests per 60-second window.",
        difficulty: "hard",
        example_input: "requests at t=1, 2, 5, 10, 20, 25",
        example_output: "t=25 returns false (exceeded 5 requests in 60s)",
        constraints: "Timestamps are in non-decreasing order.",
        topic: "Scalability & Load Balancing",
        explanation: "Maintain queue of timestamps for each user. Evict timestamps older than (current_time - 60). Allow request if queue size < limit.",
      },
    ],
  },
};

/**
 * Retrieves and balances fallback questions across multiple selected subjects, sub-topics, and difficulty filters.
 */
export function getBalancedQuestionsForConfig(config: {
  selectedSubjects: string[];
  selectedTopics?: Record<string, string[]>;
  difficulty?: string;
  numMcqs: number;
  numCoding: number;
}) {
  const { selectedSubjects, selectedTopics = {}, difficulty = "Mixed", numMcqs, numCoding } = config;
  const activeSubjects = selectedSubjects.length > 0 ? selectedSubjects : Object.keys(FALLBACK_QUESTIONS);

  const selectedMcqList: Array<FallbackMCQ & { subject: string }> = [];
  const selectedCodingList: Array<FallbackCoding & { subject: string }> = [];

  // Gather eligible pool across all selected subjects
  activeSubjects.forEach((subjectName) => {
    const subjectBank = FALLBACK_QUESTIONS[subjectName] || FALLBACK_QUESTIONS["Data Structures"];
    const topicFilter = selectedTopics[subjectName] || [];

    // Filter MCQs by sub-topic if specific sub-topics were selected
    const eligibleMcqs = subjectBank.mcqs.filter((q) => {
      if (topicFilter.length === 0) return true;
      return q.topic ? topicFilter.includes(q.topic) : true;
    });

    // Filter Coding by sub-topic & difficulty
    const eligibleCoding = subjectBank.coding.filter((q) => {
      const matchTopic = topicFilter.length === 0 || (q.topic ? topicFilter.includes(q.topic) : true);
      const matchDiff =
        !difficulty || difficulty === "Mixed" || q.difficulty?.toLowerCase() === difficulty.toLowerCase();
      return matchTopic && matchDiff;
    });

    eligibleMcqs.forEach((q) => selectedMcqList.push({ ...q, subject: subjectName }));
    eligibleCoding.forEach((q) => selectedCodingList.push({ ...q, subject: subjectName }));
  });

  // Pick balanced subset for MCQs
  const mcqResult: Array<{ question: string; options: string[]; correct: string; topic: string; explanation: string; subject: string }> = [];
  if (numMcqs > 0 && selectedMcqList.length > 0) {
    for (let i = 0; i < numMcqs; i++) {
      const item = selectedMcqList[i % selectedMcqList.length];
      mcqResult.push({
        question: item.question,
        options: item.options,
        correct: item.correct,
        topic: item.topic || "General",
        explanation: item.explanation,
        subject: item.subject,
      });
    }
  }

  // Pick balanced subset for Coding
  const codingResult: Array<{
    question: string;
    difficulty: "easy" | "medium" | "hard";
    example_input: string;
    example_output: string;
    constraints: string;
    topic: string;
    explanation: string;
    subject: string;
  }> = [];

  if (numCoding > 0 && selectedCodingList.length > 0) {
    for (let i = 0; i < numCoding; i++) {
      const item = selectedCodingList[i % selectedCodingList.length];
      codingResult.push({
        question: item.question,
        difficulty: item.difficulty,
        example_input: item.example_input,
        example_output: item.example_output,
        constraints: item.constraints,
        topic: item.topic || "General",
        explanation: item.explanation,
        subject: item.subject,
      });
    }
  }

  return {
    mcqQuestions: mcqResult,
    codingQuestions: codingResult,
  };
}

/**
 * Backward compatibility helper for single subject lookup
 */
export function getFallbackQuestionsForTopic(
  topicName: string,
  numMcqs: number,
  numCoding: number
) {
  return getBalancedQuestionsForConfig({
    selectedSubjects: [topicName],
    numMcqs,
    numCoding,
  });
}
