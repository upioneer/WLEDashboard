import { useState, useMemo, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { GUIDES, GUIDE_CATEGORIES } from "./guidesData.js"
import { copyToClipboard } from "../../lib/clipboard.js"
import { useUIStore } from "../../stores/uiStore.js"
import styles from "./Guides.module.css"

export function Guides() {
  const [searchParams, setSearchParams] = useSearchParams()
  const addToast = useUIStore(s => s.addToast)

  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  // Target topic from URL query param (?topic=...)
  const topicParam = searchParams.get("topic")

  const [selectedGuideId, setSelectedGuideId] = useState(() => {
    if (topicParam && GUIDES.some(g => g.id === topicParam)) {
      return topicParam
    }
    return GUIDES[0]?.id || ""
  })

  // Synchronize when URL search param changes
  useEffect(() => {
    if (topicParam && GUIDES.some(g => g.id === topicParam)) {
      setSelectedGuideId(topicParam)
      const matched = GUIDES.find(g => g.id === topicParam)
      if (matched && activeCategory !== "all" && matched.category !== activeCategory) {
        setActiveCategory("all")
      }
    }
  }, [topicParam, activeCategory])

  // Filter guides by category and search query
  const filteredGuides = useMemo(() => {
    const q = search.trim().toLowerCase()
    return GUIDES.filter(g => {
      const matchesCat = activeCategory === "all" || g.category === activeCategory
      if (!matchesCat) return false
      if (!q) return true

      const inTitle = g.title.toLowerCase().includes(q)
      const inSummary = g.summary.toLowerCase().includes(q)
      const inTags = g.tags?.some(t => t.toLowerCase().includes(q))
      const inSections = g.sections?.some(s =>
        s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
      )

      return inTitle || inSummary || inTags || inSections
    })
  }, [search, activeCategory])

  // Ensure an active guide is selected within filtered set
  useEffect(() => {
    if (filteredGuides.length > 0 && !filteredGuides.some(g => g.id === selectedGuideId)) {
      setSelectedGuideId(filteredGuides[0].id)
    }
  }, [filteredGuides, selectedGuideId])

  const activeGuide = useMemo(() => {
    return GUIDES.find(g => g.id === selectedGuideId) || filteredGuides[0] || null
  }, [selectedGuideId, filteredGuides])

  const handleSelectGuide = useCallback((id) => {
    setSelectedGuideId(id)
    setSearchParams({ topic: id })
  }, [setSearchParams])

  const handleCopyCode = useCallback(async (codeText, desc) => {
    const success = await copyToClipboard(codeText)
    if (success) {
      addToast({ message: "Code snippet copied to clipboard", type: "success" })
    } else {
      addToast({ message: "Failed to copy snippet", type: "error" })
    }
  }, [addToast])

  return (
    <main className={styles.page} id="main-content">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>How-To & Guides</h1>
            <p className={styles.subtitle}>
              In-depth architecture references, configuration walkthroughs, and operational guides for WLED and WLEDashboard.
            </p>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchRow}>
            <span className={styles.searchIcon} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guides, keywords, or topics..."
              className={styles.searchInput}
              aria-label="Search guides"
            />
            {search && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3L11 11M3 11L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.filterChips} role="group" aria-label="Filter guides by category">
            {GUIDE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={[styles.chip, activeCategory === cat.id && styles.chipActive].filter(Boolean).join(" ")}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Layout: Catalog Sidebar + Active Guide Panel */}
      {filteredGuides.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No matching guides found</h2>
          <p className={styles.emptyDesc}>Try adjusting your search query or clearing the category filter.</p>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => { setSearch(""); setActiveCategory("all") }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Left: Guide Selector List */}
          <nav className={styles.sidebarList} aria-label="Guide index">
            {filteredGuides.map(guide => {
              const isSelected = guide.id === activeGuide?.id
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => handleSelectGuide(guide.id)}
                  className={[styles.guideCard, isSelected && styles.guideCardActive].filter(Boolean).join(" ")}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.categoryTag}>{guide.category}</span>
                    <span className={styles.readTime}>{guide.readTime}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{guide.title}</h3>
                  <p className={styles.cardSummary}>{guide.summary}</p>
                </button>
              )
            })}
          </nav>

          {/* Right: Active Guide Detail */}
          {activeGuide && (
            <article className={styles.detailPanel} aria-labelledby="guide-active-title">
              <header className={styles.detailHeader}>
                <div className={styles.detailMeta}>
                  <span className={styles.categoryTag}>{activeGuide.category}</span>
                  <span className={styles.readTime}>{activeGuide.readTime}</span>
                </div>
                <h2 id="guide-active-title" className={styles.detailTitle}>{activeGuide.title}</h2>
                <p className={styles.detailSummary}>{activeGuide.summary}</p>
              </header>

              {/* Table of Contents jump bar */}
              {activeGuide.sections?.length > 1 && (
                <nav className={styles.toc} aria-label="Table of contents">
                  <span className={styles.tocTitle}>Table of Contents</span>
                  <div className={styles.tocLinks}>
                    {activeGuide.sections.map((section, idx) => (
                      <a
                        key={idx}
                        href={`#section-${idx}`}
                        className={styles.tocLink}
                      >
                        {section.title}
                      </a>
                    ))}
                  </div>
                </nav>
              )}

              {/* Guide Content Sections */}
              {activeGuide.sections?.map((sec, sIdx) => (
                <section key={sIdx} id={`section-${sIdx}`} className={styles.section}>
                  <h3 className={styles.sectionTitle}>{sec.title}</h3>
                  {sec.content && <p className={styles.sectionText}>{sec.content}</p>}

                  {sec.diagram && (
                    <div className={styles.diagramBox} role="img" aria-label={sec.title + " diagram"}>
                      {sec.diagram}
                    </div>
                  )}

                  {sec.steps && (
                    <ol className={styles.stepsList}>
                      {sec.steps.map((step, stepIdx) => (
                        <li key={stepIdx} className={styles.stepItem}>
                          <span className={styles.stepNumber}>{stepIdx + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {sec.table && (
                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            {sec.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className={styles.th}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sec.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className={styles.tr}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className={styles.td}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sec.callout && (
                    <div className={[
                      styles.callout,
                      sec.callout.type === "tip" && styles.calloutTip,
                      sec.callout.type === "note" && styles.calloutNote
                    ].filter(Boolean).join(" ")}>
                      <h4 className={styles.calloutTitle}>{sec.callout.title}</h4>
                      <p className={styles.calloutText}>{sec.callout.text}</p>
                    </div>
                  )}

                  {sec.code && (
                    <div className={styles.codeContainer}>
                      <div className={styles.codeHeader}>
                        <span className={styles.codeDesc}>{sec.code.description} ({sec.code.language})</span>
                        <button
                          type="button"
                          className={styles.copyCodeBtn}
                          onClick={() => handleCopyCode(sec.code.content, sec.code.description)}
                          title="Copy snippet to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className={styles.codeSnippet}>
                        <code>{sec.code.content}</code>
                      </pre>
                    </div>
                  )}
                </section>
              ))}
            </article>
          )}
        </div>
      )}
    </main>
  )
}
