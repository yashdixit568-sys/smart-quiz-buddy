/**
 * Fallback questions for all 8 core CS topics.
 * Used when edge functions hit rate limits, timeouts, or network disconnection.
 */

export interface FallbackMCQ {
  question: string;
  options: string[];
  correct: string;
}

export interface FallbackCoding {
  question: string;
  difficulty: "easy" | "medium" | "hard";
  example_input: string;
  example_output: string;
  constraints: string;
}

export interface TopicQuestions {
  mcqs: FallbackMCQ[];
  coding: FallbackCoding[];
}

export const FALLBACK_QUESTIONS: Record<string, TopicQuestions> = {
  "Data Structures": {
    mcqs: [
      {
        question: "Which data structure is primarily used to implement LRU (Least Recently Used) cache for O(1) operations?",
        options: [
          "Hash Map with a Doubly Linked List",
          "Binary Search Tree with Array",
          "Single Linked List with Stack",
          "Min-Heap with Queue",
        ],
        correct: "A",
      },
      {
        question: "What is the worst-case time complexity of searching for an element in an un-balanced Binary Search Tree (BST)?",
        options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"],
        correct: "C",
      },
      {
        question: "Which data structure is best suited for evaluating arithmetic expressions written in postfix notation?",
        options: ["Queue", "Stack", "Priority Queue", "Circular Buffer"],
        correct: "B",
      },
      {
        question: "In a min-heap with n elements, what is the time complexity of deleting the minimum element?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correct: "B",
      },
      {
        question: "What is the average amortized time complexity for inserting an element into a dynamic array (like std::vector or ArrayList)?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n^2)"],
        correct: "C",
      },
    ],
    coding: [
      {
        question: "Reverse a Singly Linked List.\n\nGiven the head of a singly linked list, reverse the list, and return the reversed list's head node.",
        difficulty: "easy",
        example_input: "head = [1,2,3,4,5]",
        example_output: "[5,4,3,2,1]",
        constraints: "The number of nodes in the list is the range [0, 5000]. Node values are between -5000 and 5000.",
      },
      {
        question: "Implement a queue using two stacks.\n\nYour queue should support push(), pop(), peek(), and empty() operations with O(1) amortized time complexity.",
        difficulty: "medium",
        example_input: '["MyQueue", "push", "push", "peek", "pop", "empty"]\n[[], [1], [2], [], [], []]',
        example_output: "[null, null, null, 1, 1, false]",
        constraints: "1 <= x <= 100. Maximum of 100 calls will be made to push, pop, peek, and empty.",
      },
    ],
  },
  Algorithms: {
    mcqs: [
      {
        question: "What is the worst-case time complexity of QuickSort?",
        options: ["O(n log n)", "O(n^2)", "O(n)", "O(log n)"],
        correct: "B",
      },
      {
        question: "Dijkstra's algorithm cannot handle graphs that contain:",
        options: [
          "Cycles",
          "Directed edges",
          "Negative edge weights",
          "Dense edges",
        ],
        correct: "C",
      },
      {
        question: "Which algorithmic strategy is used by MergeSort?",
        options: [
          "Greedy Approach",
          "Divide and Conquer",
          "Dynamic Programming",
          "Backtracking",
        ],
        correct: "B",
      },
      {
        question: "What is the optimal time complexity to find the median of an unsorted array of size n?",
        options: ["O(n log n)", "O(n)", "O(log n)", "O(n^2)"],
        correct: "B",
      },
      {
        question: "Which algorithm is commonly used to find strongly connected components in a directed graph in linear time?",
        options: [
          "Tarjan's or Kosaraju's Algorithm",
          "Prim's Algorithm",
          "Bellman-Ford Algorithm",
          "Floyd-Warshall Algorithm",
        ],
        correct: "A",
      },
    ],
    coding: [
      {
        question: "Two Sum.\n\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        difficulty: "easy",
        example_input: "nums = [2,7,11,15], target = 9",
        example_output: "[0,1]",
        constraints: "2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9",
      },
      {
        question: "Longest Substring Without Repeating Characters.\n\nGiven a string s, find the length of the longest substring without repeating characters.",
        difficulty: "medium",
        example_input: 's = "abcabcbb"',
        example_output: "3 (The answer is 'abc', with the length of 3)",
        constraints: "0 <= s.length <= 5 * 10^4, s consists of English letters, digits, symbols and spaces.",
      },
    ],
  },
  "Object-Oriented Programming": {
    mcqs: [
      {
        question: "Which OOP principle allows a subclass to provide a specific implementation of a method that is already provided by its parent class?",
        options: [
          "Method Overriding (Polymorphism)",
          "Encapsulation",
          "Data Abstraction",
          "Interface Segregation",
        ],
        correct: "A",
      },
      {
        question: "What does the 'L' stand for in SOLID design principles?",
        options: [
          "Linear Responsibility Principle",
          "Liskov Substitution Principle",
          "Lazy Loading Principle",
          "Logical Interface Principle",
        ],
        correct: "B",
      },
      {
        question: "Which design pattern ensures that a class has only one instance and provides a global access point to it?",
        options: ["Factory Pattern", "Observer Pattern", "Singleton Pattern", "Decorator Pattern"],
        correct: "C",
      },
      {
        question: "What is the primary benefit of Encapsulation in OOP?",
        options: [
          "Faster program execution",
          "Restricting direct access to internal object state and preventing unintended modifications",
          "Allowing multiple inheritance in single inheritance languages",
          "Automatic garbage collection",
        ],
        correct: "B",
      },
      {
        question: "In Object-Oriented Design, composition is often favored over:",
        options: ["Abstraction", "Inheritance", "Polymorphism", "Encapsulation"],
        correct: "B",
      },
    ],
    coding: [
      {
        question: "Design a Parking Lot system.\n\nImplement a class `ParkingLot` that has slots for 3 types of vehicles: small (motorcycle), medium (car), and large (bus). Implement `park(vehicleType)` and `unpark(ticketId)`.",
        difficulty: "medium",
        example_input: 'lot = ParkingLot(small=10, medium=20, large=5)\nticket = lot.park("car")',
        example_output: 'ticket_id returned; available car slots decreases to 19',
        constraints: "Thread-safe consideration, all IDs must be unique.",
      },
      {
        question: "Implement the Observer Pattern in code.\n\nCreate a `WeatherStation` subject that notifies multiple `DisplayDevice` observers whenever the temperature changes.",
        difficulty: "medium",
        example_input: 'station.register(phoneDisplay)\nstation.setTemperature(25)',
        example_output: '"Phone Display updated: 25C"',
        constraints: "Support registering, unregistering, and notifying arbitrary observers.",
      },
    ],
  },
  "Database Management": {
    mcqs: [
      {
        question: "Which normal form removes transitive dependencies of non-prime attributes on candidate keys?",
        options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "BCNF"],
        correct: "C",
      },
      {
        question: "What property in ACID guarantees that transactions are executed independently and without interference?",
        options: ["Atomicity", "Consistency", "Isolation", "Durability"],
        correct: "C",
      },
      {
        question: "Which data structure is most commonly utilized for relational database indexes to support range queries efficiently?",
        options: ["Hash Table", "B+ Tree", "Red-Black Tree", "Trie"],
        correct: "B",
      },
      {
        question: "What is the key difference between WHERE and HAVING clauses in SQL?",
        options: [
          "WHERE filters rows before aggregation, while HAVING filters groups after aggregation",
          "HAVING is used only for sorting",
          "WHERE works only on numbers",
          "There is no functional difference",
        ],
        correct: "A",
      },
      {
        question: "In database concurrency control, what anomaly is prevented by the 'Serializable' isolation level but not by 'Repeatable Read'?",
        options: ["Dirty Read", "Non-repeatable Read", "Phantom Read", "Lost Update"],
        correct: "C",
      },
    ],
    coding: [
      {
        question: "Write an SQL query to find the second highest salary from an `Employee` table with schema `(id INT, salary INT)`.",
        difficulty: "medium",
        example_input: 'Employee table:\n+----+--------+\n| id | salary |\n+----+--------+\n| 1  | 100    |\n| 2  | 200    |\n| 3  | 300    |\n+----+--------+',
        example_output: '+---------------------+\n| SecondHighestSalary |\n+---------------------+\n| 200                 |\n+---------------------+',
        constraints: "If there is no second highest salary, return NULL.",
      },
      {
        question: "Write a SQL query to find all customers who never ordered anything from table `Customers (id, name)` and `Orders (id, customerId)`.",
        difficulty: "easy",
        example_input: 'Customers: [(1, "Joe"), (2, "Henry")]\nOrders: [(1, 1)]',
        example_output: 'Customers: ["Henry"]',
        constraints: "Use LEFT JOIN or NOT IN or NOT EXISTS.",
      },
    ],
  },
  "Operating Systems": {
    mcqs: [
      {
        question: "Which of the following conditions is NOT required for a deadlock to occur (Coffman conditions)?",
        options: [
          "Mutual Exclusion",
          "Hold and Wait",
          "Preemption Allowed",
          "Circular Wait",
        ],
        correct: "C",
      },
      {
        question: "What is the primary purpose of Translation Lookaside Buffer (TLB)?",
        options: [
          "Speed up virtual-to-physical memory address translation",
          "Manage disk cache for file systems",
          "Synchronize CPU cache across multiple cores",
          "Handle network packet buffering",
        ],
        correct: "A",
      },
      {
        question: "Which CPU scheduling algorithm is preemptive and minimizes average waiting time?",
        options: [
          "First-Come, First-Served (FCFS)",
          "Shortest Remaining Time First (SRTF)",
          "Priority Scheduling (Non-preemptive)",
          "Multilevel Feedback Queue with FIFO only",
        ],
        correct: "B",
      },
      {
        question: "What phenomenon happens when a computer spends more time paging memory than executing instructions?",
        options: ["Deadlock", "Thrashing", "Starvation", "Race Condition"],
        correct: "B",
      },
      {
        question: "What is the main difference between a process and a thread?",
        options: [
          "Processes share memory space by default; threads do not",
          "Threads within the same process share code, data, and address space; processes have isolated address spaces",
          "Threads can run on multiple machines; processes cannot",
          "Processes are scheduled by compilers; threads are scheduled by BIOS",
        ],
        correct: "B",
      },
    ],
    coding: [
      {
        question: "Implement the Producer-Consumer problem using pseudocode / synchronization primitives.\n\nCoordinate a bounded buffer of size N between producers and consumers using mutexes and condition variables/semaphores.",
        difficulty: "medium",
        example_input: "Buffer capacity = 5, 2 producers, 3 consumers",
        example_output: "Producers wait when full; consumers wait when empty; no race condition.",
        constraints: "Prevent race conditions and deadlocks without busy waiting.",
      },
      {
        question: "Implement LRU Cache Page Replacement.\n\nGiven capacity `cap`, write methods `get(key)` and `put(key, value)` with O(1) time complexity.",
        difficulty: "medium",
        example_input: 'cache = LRUCache(2)\ncache.put(1, 1)\ncache.put(2, 2)\ncache.get(1) // returns 1\ncache.put(3, 3) // evicts key 2\ncache.get(2) // returns -1',
        example_output: "1, -1",
        constraints: "1 <= capacity <= 3000, 0 <= key <= 10^4",
      },
    ],
  },
  "Computer Networks": {
    mcqs: [
      {
        question: "In the OSI model, at which layer does TLS/SSL encryption primarily operate?",
        options: ["Transport / Session Layer", "Network Layer", "Data Link Layer", "Physical Layer"],
        correct: "A",
      },
      {
        question: "How does TCP ensure reliable delivery of data packets?",
        options: [
          "Three-way handshake, sequence numbers, checksums, and acknowledgments (ACKs) with retransmissions",
          "Broadcasting packets to all subnet interfaces",
          "Encrypting payloads with RSA keys",
          "Using UDP as a fallback tunnel",
        ],
        correct: "A",
      },
      {
        question: "What is the purpose of the ARP (Address Resolution Protocol)?",
        options: [
          "Map an IP address to a physical MAC address",
          "Resolve domain names to IP addresses",
          "Route packets across autonomous systems",
          "Allocate dynamic IP addresses to clients",
        ],
        correct: "A",
      },
      {
        question: "What HTTP status code is returned when a client makes too many requests in a given amount of time (Rate Limited)?",
        options: ["401 Unauthorized", "403 Forbidden", "429 Too Many Requests", "503 Service Unavailable"],
        correct: "C",
      },
      {
        question: "Which protocol is connectionless and typically preferred for latency-sensitive applications like video streaming and VoIP?",
        options: ["TCP", "UDP", "FTP", "SSH"],
        correct: "B",
      },
    ],
    coding: [
      {
        question: "Validate IP Address.\n\nGiven a string queryIP, return 'IPv4' if IP is a valid IPv4 address, 'IPv6' if IP is a valid IPv6 address or 'Neither' if IP is not a correct IP of any type.",
        difficulty: "medium",
        example_input: 'queryIP = "172.16.254.1"',
        example_output: '"IPv4"',
        constraints: "IPv4: 4 decimal numbers 0-255 separated by dots, no leading zeros. IPv6: 8 groups of 4 hexadecimal digits separated by colons.",
      },
      {
        question: "Design a Token Bucket Rate Limiter.\n\nImplement a class `RateLimiter` with `allow_request(client_id)` that refills tokens at rate R per second up to capacity C.",
        difficulty: "medium",
        example_input: 'limiter = RateLimiter(capacity=5, refill_rate=1)\nallow_request("user1") -> True',
        example_output: "Returns True if tokens available; False if throttled.",
        constraints: "Support multiple clients concurrently.",
      },
    ],
  },
  "Web Development": {
    mcqs: [
      {
        question: "What does CORS (Cross-Origin Resource Sharing) prevent by default in modern web browsers?",
        options: [
          "Web pages making unrestricted AJAX/Fetch requests to a different domain, protocol, or port without server consent",
          "Loading CSS stylesheets from CDN",
          "Embedding images from external domains",
          "Running WebAssembly binaries",
        ],
        correct: "A",
      },
      {
        question: "In React, what hook is used to memoize expensive computations between re-renders?",
        options: ["useCallback", "useMemo", "useRef", "useEffect"],
        correct: "B",
      },
      {
        question: "What is the purpose of HTTP 'SameSite' attribute on Cookies?",
        options: [
          "Mitigate Cross-Site Request Forgery (CSRF) attacks",
          "Compress cookie payload using Brotli",
          "Enable cross-domain sharing of authentication tokens",
          "Encrypt the cookie with AES-256",
        ],
        correct: "A",
      },
      {
        question: "What is the key difference between localStorage and sessionStorage?",
        options: [
          "localStorage data persists until explicitly cleared; sessionStorage data is cleared when the browser tab/session closes",
          "sessionStorage has larger storage capacity (1GB vs 5MB)",
          "localStorage is accessible on the server; sessionStorage is client-only",
          "sessionStorage is synchronized across all browser windows",
        ],
        correct: "A",
      },
      {
        question: "In modern CSS, what layout module is designed for one-dimensional layouts (row or column)?",
        options: ["CSS Grid", "Flexbox", "Floats", "Multi-column layout"],
        correct: "B",
      },
    ],
    coding: [
      {
        question: "Implement a Debounce Function in JavaScript/TypeScript.\n\nCreate a function `debounce(fn, delay)` that ensures `fn` is only invoked after `delay` milliseconds have elapsed since the last call.",
        difficulty: "easy",
        example_input: "debouncedFn = debounce(searchApi, 300);\ndebouncedFn('a'); debouncedFn('ab');",
        example_output: "searchApi called once with 'ab' after 300ms",
        constraints: "Handle arguments and `this` context properly.",
      },
      {
        question: "Deep Clone an Object.\n\nWrite a function `deepClone(obj)` that recursively copies nested objects and arrays without mutating the original or keeping references.",
        difficulty: "medium",
        example_input: 'deepClone({ a: 1, b: { c: 2, d: [3, 4] } })',
        example_output: "Exact independent copy of object",
        constraints: "Handle nested objects, arrays, and primitive values.",
      },
    ],
  },
  "System Design": {
    mcqs: [
      {
        question: "According to the CAP Theorem, in the presence of a Network Partition (P), a distributed system must choose between:",
        options: [
          "Consistency and Availability",
          "Performance and Scalability",
          "Latency and Durability",
          "Throughput and Reliability",
        ],
        correct: "A",
      },
      {
        question: "Which caching strategy writes data to both the cache and the backing database simultaneously before returning success?",
        options: ["Write-Around", "Write-Through", "Write-Back (Write-Behind)", "Cache-Aside"],
        correct: "B",
      },
      {
        question: "Consistent Hashing is commonly used in distributed caches and load balancers because:",
        options: [
          "It minimizes the number of keys that need to be remapped when nodes are added or removed",
          "It guarantees O(1) database queries without indexing",
          "It replaces the need for replication",
          "It forces all traffic through a single master gateway",
        ],
        correct: "A",
      },
      {
        question: "What is the primary purpose of a Message Queue (like Apache Kafka or RabbitMQ) in a microservices architecture?",
        options: [
          "Decouple producer and consumer services and handle asynchronous, spike-tolerant communication",
          "Serve as primary relational database storage",
          "Encrypt network traffic between microservices",
          "Manage DNS routing for APIs",
        ],
        correct: "A",
      },
      {
        question: "What is database horizontal sharding?",
        options: [
          "Splitting rows of a table across multiple database instances based on a shard key",
          "Adding more CPU and RAM to a single database server",
          "Creating read replicas from a single primary",
          "Moving columns of a table into separate normalized tables",
        ],
        correct: "A",
      },
    ],
    coding: [
      {
        question: "Design a URL Shortener (like TinyURL).\n\nImplement `encode(longUrl)` and `decode(shortUrl)` using base62 encoding or hashing.",
        difficulty: "medium",
        example_input: 'encode("https://example.com/very/long/url")',
        example_output: '"https://tiny.url/4e9iAk" (and decoding returns the original URL)',
        constraints: "Collision-resistant, short URLs must be <= 7 characters.",
      },
      {
        question: "Design an In-Memory Key-Value Store with TTL (Time To Live).\n\nImplement `set(key, value, ttlMs)` and `get(key)` which returns `null` if expired.",
        difficulty: "medium",
        example_input: 'store.set("token", "xyz", 100)\nstore.get("token") -> "xyz"\n(wait 150ms)\nstore.get("token") -> null',
        example_output: '"xyz", then null',
        constraints: "O(1) average lookup and insertion. Clean up expired keys efficiently.",
      },
    ],
  },
};

/**
 * Returns fallback questions for a given topic
 */
export function getFallbackQuestionsForTopic(
  topicName: string,
  numMcqs: number,
  numCoding: number
): { mcqQuestions: FallbackMCQ[]; codingQuestions: FallbackCoding[] } {
  const topicData = FALLBACK_QUESTIONS[topicName] || FALLBACK_QUESTIONS["Data Structures"];
  
  const selectedMcqs: FallbackMCQ[] = [];
  const availableMcqs = topicData.mcqs || [];
  for (let i = 0; i < numMcqs; i++) {
    const q = availableMcqs[i % availableMcqs.length];
    selectedMcqs.push({
      ...q,
      question: numMcqs > availableMcqs.length && i >= availableMcqs.length 
        ? `${q.question} (Variation ${Math.floor(i / availableMcqs.length) + 1})`
        : q.question,
    });
  }

  const selectedCoding: FallbackCoding[] = [];
  const availableCoding = topicData.coding || [];
  for (let i = 0; i < numCoding; i++) {
    const q = availableCoding[i % availableCoding.length];
    selectedCoding.push(q);
  }

  return {
    mcqQuestions: selectedMcqs,
    codingQuestions: selectedCoding,
  };
}
