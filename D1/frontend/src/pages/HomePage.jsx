import React, { useMemo, useState } from "react";
import Feed from "../components/Feed";
import SearchInput from "../components/SearchInput";

export default function HomePage({ projects }){
  
  const [searchText, setSearchText] = useState("");

  const filtered = useMemo(()=>{
    const t = searchText.trim().toLowerCase();
    if (!t) return projects;
    return projects.filter(p => (p.title || "").toLowerCase().includes(t));
  }, [projects, searchText]);

  function resolveOwnerName(ownerId){
    return ownerId;
  }

  return (
    <section>
      <SearchInput value={searchText} onChange={setSearchText} placeholder="Search projects by title" />
      <Feed projects={filtered} resolveOwnerName={resolveOwnerName} />
    </section>
  );
}
