// Converts each heterogeneous object in data/persona-knowledge.json into a
// { id, text, meta } chunk suitable for embedding + retrieval.
// "text" is what gets embedded. "meta" is what gets shown to the LLM at
// generation time (kept close to the original fields so nothing is lost).

export function normalize(obj, index) {
  // Standard Q&A
  if (obj.question && obj.answer) {
    return {
      id: obj.id ?? `qa_${index}`,
      text: `Question: ${obj.question}\nAnswer: ${obj.answer}`,
      meta: { type: "qa", question: obj.question, answer: obj.answer, topic: obj.topic, tags: obj.tags },
    };
  }

  // Memories
  if (obj.memory) {
    return {
      id: obj.id ?? `memory_${index}`,
      text: `Memory - ${obj.title}: ${obj.memory}`,
      meta: { type: "memory", title: obj.title, memory: obj.memory, category: obj.category, emotion: obj.emotion },
    };
  }

  // Principles
  if (obj.principle) {
    return {
      id: obj.id ?? `principle_${index}`,
      text: `Principle: ${obj.principle}. ${obj.explanation ?? ""}`,
      meta: { type: "principle", principle: obj.principle, explanation: obj.explanation, keywords: obj.keywords },
    };
  }

  // Situation -> response
  if (obj.situation && obj.response) {
    return {
      id: obj.id ?? `situation_${index}`,
      text: `Situation: ${obj.situation}\nResponse: ${obj.response}`,
      meta: { type: "situation", situation: obj.situation, response: obj.response, tags: obj.tags },
    };
  }

  // Scenario/intent/response/tone
  if (obj.scenario && obj.response) {
    return {
      id: obj.id ?? `scenario_${index}`,
      text: `Scenario: ${obj.scenario}\nIntent: ${obj.intent ?? ""}\nResponse: ${obj.response}`,
      meta: { type: "scenario", scenario: obj.scenario, intent: obj.intent, response: obj.response, tone: obj.tone },
    };
  }

  // Skill learning stories
  if (obj.skill && obj.how_i_learned) {
    return {
      id: obj.id ?? `skill_${index}`,
      text: `Skill: ${obj.skill}. How I learned it: ${obj.how_i_learned}`,
      meta: { type: "skill", skill: obj.skill, how_i_learned: obj.how_i_learned },
    };
  }

  // Problem-solving thinking
  if (obj.problem && obj.thinking) {
    return {
      id: obj.id ?? `problem_${index}`,
      text: `Problem: ${obj.problem}\nMy thinking: ${obj.thinking}`,
      meta: { type: "problem", problem: obj.problem, thinking: obj.thinking },
    };
  }

  // Context/response
  if (obj.context && obj.response) {
    return {
      id: obj.id ?? `context_${index}`,
      text: `Context: ${obj.context}\nResponse: ${obj.response}`,
      meta: { type: "context_response", context: obj.context, response: obj.response },
    };
  }

  // Applies-to pattern
  if (obj.pattern) {
    return {
      id: obj.id ?? `pattern_${index}`,
      text: `Pattern: ${obj.pattern}. ${obj.description ?? ""} (applies to: ${obj.applies_to ?? ""})`,
      meta: { type: "pattern", pattern: obj.pattern, description: obj.description, applies_to: obj.applies_to },
    };
  }

  // Prompt/answer
  if (obj.prompt && obj.answer) {
    return {
      id: obj.id ?? `prompt_${index}`,
      text: `Prompt: ${obj.prompt}\nAnswer: ${obj.answer}`,
      meta: { type: "prompt", prompt: obj.prompt, answer: obj.answer },
    };
  }

  // Retrieval hints
  if (obj.user_intent && obj.retrieve) {
    return {
      id: obj.id ?? `retrieve_${index}`,
      text: `User intent: ${obj.user_intent}\nRelevant info: ${obj.retrieve}`,
      meta: { type: "retrieval_hint", user_intent: obj.user_intent, retrieve: obj.retrieve },
    };
  }

  // Response style
  if (obj.response_style) {
    return {
      id: obj.id ?? `style_${index}`,
      text: `Response style (${obj.type ?? ""}): ${obj.response_style}`,
      meta: { type: "response_style", response_style: obj.response_style, style_type: obj.type },
    };
  }

  // Behavior/confidence scenario
  if (obj.behavior && obj.scenario) {
    return {
      id: obj.id ?? `behavior_${index}`,
      text: `Scenario: ${obj.scenario}\nBehavior: ${obj.behavior}`,
      meta: { type: "behavior", scenario: obj.scenario, behavior: obj.behavior, confidence_threshold: obj.confidence_threshold },
    };
  }

  // Expected traits
  if (obj.expected_traits && obj.question) {
    return {
      id: obj.id ?? `traits_${index}`,
      text: `Question: ${obj.question}\nExpected traits: ${(obj.expected_traits || []).join(", ")}`,
      meta: { type: "expected_traits", question: obj.question, expected_traits: obj.expected_traits },
    };
  }

  // Source/confidence metadata
  if (obj.source && obj.confidence) {
    return {
      id: obj.id ?? `source_${index}`,
      text: `Source: ${obj.source} (confidence: ${obj.confidence})`,
      meta: { type: "source", source: obj.source, confidence: obj.confidence, update_frequency: obj.update_frequency },
    };
  }

  // Singleton: values
  if (obj.values) {
    return {
      id: `values`,
      text: `Core values: ${obj.values.map(v => `${v.name} - ${v.description}`).join("; ")}`,
      meta: { type: "values", values: obj.values },
    };
  }

  // Singleton: decision_preferences
  if (obj.decision_preferences) {
    return {
      id: `decision_preferences`,
      text: `Decision preferences: ${Object.entries(obj.decision_preferences).map(([k, v]) => `${k}: ${v}`).join(", ")}`,
      meta: { type: "decision_preferences", decision_preferences: obj.decision_preferences },
    };
  }

  // Singleton: nodes (concept graph)
  if (obj.nodes) {
    return {
      id: `nodes`,
      text: `Concept relationships: ${obj.nodes.map(n => `${n.id} relates to ${(n.related || []).join(", ")}`).join(". ")}`,
      meta: { type: "nodes", nodes: obj.nodes },
    };
  }

  // Singleton: contexts (tone rules)
  if (obj.contexts) {
    return {
      id: `contexts`,
      text: `Tone by context: ${Object.entries(obj.contexts).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("; ")}`,
      meta: { type: "contexts", contexts: obj.contexts },
    };
  }

  // Singleton: timeline
  if (obj.timeline) {
    return {
      id: `timeline`,
      text: `Timeline: ${obj.timeline.map(t => `${t.year}: ${(t.events || t.goals || []).join(", ")}`).join(". ")}`,
      meta: { type: "timeline", timeline: obj.timeline },
    };
  }

  // Fallback: dump whatever fields exist as text
  const fallbackText = Object.entries(obj)
    .filter(([k]) => k !== "id")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(". ");
  return {
    id: obj.id ?? `misc_${index}`,
    text: fallbackText,
    meta: { type: "misc", raw: obj },
  };
}
