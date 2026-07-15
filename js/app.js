(function () {
  "use strict";

  const DEFAULT_BASE = "USD";
  const DEFAULT_TARGET = "EUR";

  // In-memory application state. Nothing is persisted to disk;
  const state = {
    rates: null,
    ratesBase: null, 
    lastFetchedAt: null,
  };

  //Element references
  const els = {
    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    syncedText: document.getElementById("syncedText"),

    emptyState: document.getElementById("emptyState"),
    retryButton: document.getElementById("retryButton"),

    staleBanner: document.getElementById("staleBanner"),
    staleBannerText: document.getElementById("staleBannerText"),
    staleRetryButton: document.getElementById("staleRetryButton"),

    form: document.getElementById("converterForm"),
    amountInput: document.getElementById("amountInput"),
    amountError: document.getElementById("amountError"),
    fromCurrency: document.getElementById("fromCurrency"),
    toCurrency: document.getElementById("toCurrency"),
    currencyError: document.getElementById("currencyError"),
    swapButton: document.getElementById("swapButton"),
    convertButton: document.getElementById("convertButton"),

    resultBox: document.getElementById("resultBox"),
    resultPlaceholder: document.getElementById("resultPlaceholder"),
    loadingIndicator: document.getElementById("loadingIndicator"),
  };

  //Connectivity status

  function updateConnectivityDisplay() {
    const online = navigator.onLine;
    els.statusDot.classList.toggle("is-online", online);
    els.statusDot.classList.toggle("is-offline", !online);
    els.statusText.textContent = online ? "Connected" : "No connection — using last known rates";
  }

  window.addEventListener("online", updateConnectivityDisplay);
  window.addEventListener("offline", updateConnectivityDisplay);

  //Loading / empty / banner state helpers

  function setLoading(isLoading) {
    els.loadingIndicator.hidden = !isLoading;
    els.convertButton.disabled = isLoading;
  }

  function showEmptyState(show) {
    els.emptyState.hidden = !show;
    els.form.hidden = show;
  }

  function showStaleBanner(show, fetchedAt) {
    els.staleBanner.hidden = !show;
    if (show && fetchedAt) {
      els.staleBannerText.textContent =
        "Showing rates from " + formatTime(fetchedAt) + " — connection issue.";
    }
  }

  function updateSyncedText(fetchedAt) {
    els.syncedText.textContent = fetchedAt ? "Synced " + formatTime(fetchedAt) : "";
  }

  //Currency list population
  function populateCurrencySelect(selectEl, codes, selectedCode) {
    selectEl.innerHTML = "";
    if (codes.length === 0) return;

    codes.forEach((code) => {
      const option = document.createElement("option");
      option.value = sanitizeText(code);
      option.textContent = sanitizeText(code);
      if (code === selectedCode) option.selected = true;
      selectEl.appendChild(option);
    });
  }

  //Core load / retry flow

  async function loadRates() {
    setLoading(true);
    showStaleBanner(false);

    try {
      const result = await RatesAPI.getRates(DEFAULT_BASE);

      state.rates = result.rates;
      state.ratesBase = DEFAULT_BASE;
      state.lastFetchedAt = result.fetchedAt;

      showEmptyState(false);
      updateSyncedText(result.fetchedAt);

      if (result.stale) {
        showStaleBanner(true, result.fetchedAt);
      }

      const codes = Object.keys(state.rates).sort();
      if (codes.length === 0) {
        showEmptyState(true);
      } else {
        populateCurrencySelect(els.fromCurrency, codes, DEFAULT_BASE);
        populateCurrencySelect(
          els.toCurrency,
          codes,
          codes.includes(DEFAULT_TARGET) ? DEFAULT_TARGET : codes[1] || codes[0]
        );
        runConversion();
      }
    } catch (err) {
      showEmptyState(true);
      updateSyncedText(null);
    } finally {
      setLoading(false);
    }
  }

  //Conversion 
  function clearAmountError() {
    els.amountError.textContent = "";
    els.amountInput.setAttribute("aria-invalid", "false");
  }

  function setAmountError(message) {
    els.amountError.textContent = message;
    els.amountInput.setAttribute("aria-invalid", "true");
  }

  function clearCurrencyError() {
    els.currencyError.textContent = "";
  }

  function setCurrencyError(message) {
    els.currencyError.textContent = message;
  }


  function runConversion() {
    if (!state.rates) return false;

    const validation = validateAmount(els.amountInput.value);
    if (!validation.valid) {
      setAmountError(validation.message);
      els.resultBox.innerHTML = "";
      els.resultBox.appendChild(els.resultPlaceholder);
      els.resultPlaceholder.textContent = "Fix the amount above to see the conversion.";
      return false;
    }
    clearAmountError();

    const from = els.fromCurrency.value;
    const to = els.toCurrency.value;

    if (!from || !to || !(from in state.rates) || !(to in state.rates)) {
      setCurrencyError("Choose valid currencies for both fields.");
      return false;
    }
    clearCurrencyError();


    const rateFromBase = state.rates[from];
    const rateToBase = state.rates[to];
    const converted = (validation.value / rateFromBase) * rateToBase;
    const unitRate = rateToBase / rateFromBase;

    els.resultBox.innerHTML = "";
    const valueEl = document.createElement("div");
    valueEl.className = "result__value";
    valueEl.textContent =
      formatNumber(validation.value, 2) + " " + from + " = " +
      formatNumber(converted, 2) + " " + to;

    const metaEl = document.createElement("span");
    metaEl.className = "result__meta";
    metaEl.textContent = "1 " + from + " = " + formatNumber(unitRate, 4) + " " + to;

    els.resultBox.appendChild(valueEl);
    els.resultBox.appendChild(metaEl);

    return true;
  }



  function logTelemetry() {
    console.log("[Analytics] User interacted with Currency Converter");
  }

  //Event wiring

  els.swapButton.addEventListener("click", () => {
    const from = els.fromCurrency.value;
    const to = els.toCurrency.value;
    els.fromCurrency.value = to;
    els.toCurrency.value = from;
    if (runConversion()) {
      logTelemetry();
    }
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (runConversion()) {
      logTelemetry();
    }
  });

  els.retryButton.addEventListener("click", loadRates);
  els.staleRetryButton.addEventListener("click", loadRates);

  //Init

  updateConnectivityDisplay();
  loadRates();
})();
