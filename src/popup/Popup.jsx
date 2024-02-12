import { useState, useEffect } from 'react'
import './Popup.css'

export const Popup = () => {
  const [currentTabUrl, setCurrentTabUrl] = useState('')
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0]
      const domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im
      const domainMatches = currentTab.url.match(domainRegex)
      const cleanUrl = domainMatches ? domainMatches[1] : ''
      setCurrentTabUrl(cleanUrl)
      setLoading(true)

      // Check if data is available in cookie
      const storedData = getCookieData(cleanUrl)
      if (storedData) {
        const parsedData = JSON.parse(storedData)
        const lastMonth = getLastMonth(parsedData)
        const twoMonthsAgo = getTwoMonthsAgo()

        if (lastMonth < twoMonthsAgo) {
          fetchData(cleanUrl)
        } else {
          setApiData(parsedData)
          setLoading(false)
        }
      } else {
        fetchData(cleanUrl)
      }
    })
  }, [])

  const fetchData = (cleanUrl) => {
    fetch(`https://data.similarweb.com/api/v1/data?domain=${encodeURIComponent(cleanUrl)}`)
      .then((response) => response.json())
      .then((data) => {
        const estimatedMonthlyVisits = data?.EstimatedMonthlyVisits

        Object.keys(estimatedMonthlyVisits).forEach((key) => {
          const value = estimatedMonthlyVisits[key]
          const date = new Date(key)
          const trafficValue =
            value >= 1000000000
              ? (value / 1000000000).toFixed(1) + 'B'
              : value >= 1000000
                ? (value / 1000000).toFixed(1) + 'M'
                : (value / 1000).toFixed(1) + 'k'
          estimatedMonthlyVisits[key] =
            `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}` +
            `: ${trafficValue}`
        })
        setCookieData(cleanUrl, JSON.stringify(estimatedMonthlyVisits))
        setApiData(estimatedMonthlyVisits)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })
  }

  const getLastMonth = (data) => {
    const dates = Object.keys(data)
    if (dates.length === 0) return null
    return new Date(dates[dates.length - 1])
  }

  const getTwoMonthsAgo = () => {
    const now = new Date()
    now.setMonth(now.getMonth() - 2)
    return now
  }

  const getCookieData = (domain) => {
    const name = `${domain}_apiData`
    const value = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
    return value ? value.pop() : null
  }

  const setCookieData = (domain, value) => {
    const name = `${domain}_apiData`
    document.cookie = `${name}=${value};path=/;`
  }

  return (
    <main className="popup-container">
      <p>Domain: {currentTabUrl}</p>
      {loading && <p>Loading...</p>}
      {apiData && !loading && (
        <ul className="api-data">
          {Object.entries(apiData).map(([key, value]) => (
            <li key={key}>{value}</li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default Popup
