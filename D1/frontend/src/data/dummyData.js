export const currentUserMock = {
  id: "u1",
  name: "Demo User",
  email: "demo@merge.app",
  bio: "Building with MERGE.",
  friends: ["u2","u3"]
};

export const dummyUsers = [
  { id: "u1", name: "Demo User", email: "demo@merge.app", bio: "Building with MERGE." },
  { id: "u2", name: "Kiara Hodgson", email: "Kiara@merge.app", bio: "Full-stack tinker (like in tinkerbell)." },
  { id: "u3", name: "Cade Robinson", email: "Cade@merge.app", bio: "I love projects" }
];

export const dummyProjects = [
  {
    id: "p1",
    title: "IMY 220",
    description: "Fun project",
    ownerId: "u2",
    tags: ["React","Nodejs"],
    files: ["README.md","server.js","index.html"],
    messages: [
      { id:"m1", type:"check-in", userId:"u2", message:"Added index.html", timestamp:"2025-09-01T10:00:00Z" },
      { id:"m2", type:"check-out", userId:"u1", message:"Reviewing README.md", timestamp:"2025-09-02T11:00:00Z" }
    ]
  },
  {
    id: "p2",
    title: "COS 330",
    description: "Not so fun.",
    ownerId: "u3",
    tags: ["Java","Cyber Security"],
    files: ["encrypt.java","passwords.txt"],
    messages: [
      { id:"m3", type:"check-in", userId:"u3", message:"Encrypted passwords", timestamp:"2025-09-02T09:00:00Z" }
    ]
  }
];
