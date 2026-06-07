import wixData from 'wix-data';

let searchResults = [];

$w.onReady(function () {
  $w('#searchSection').expand();
  $w('#resultsSection').collapse();
  $w('#confirmSection').collapse();
  $w('#noResultsText').collapse();

  $w('#resultsRepeater').onItemReady(($item, itemData) => {
    $item('#resultName').text = itemData.partyName;
    $item('#attendingRadio').value = itemData.rsvpStatus === 'attending' ? 'Yes' : '';
  });

  $w('#searchBtn').onClick(() => {
    const query = $w('#searchInput').value.trim().toUpperCase();
    if (!query) return;
    $w('#noResultsText').collapse();
    $w('#searchBtn').disable();

    console.log('Searching for:', query);

    const timeout = setTimeout(() => {
      $w('#searchBtn').enable();
      console.error('Search timed out');
    }, 8000);

    wixData.query('Import1')
      .contains('title', query)
      .find()
      .then(results => {
        clearTimeout(timeout);
        $w('#searchBtn').enable();
        console.log('Results:', results.items.length);
        if (results.items.length === 0) {
          $w('#noResultsText').expand();
          return;
        }
        $w('#noResultsText').collapse();
        searchResults = results.items;
        showResults(results.items);
      })
      .catch(err => {
        clearTimeout(timeout);
        $w('#searchBtn').enable();
        $w('#noResultsText').expand();
        console.error('Search failed:', err);
      });
  });

  $w('#submitBtn').onClick(() => {
    submitAllRsvps();
  });

  $w('#backToSearchBtn').onClick(() => {
    $w('#resultsSection').collapse();
    $w('#noResultsText').collapse();
    $w('#searchInput').value = '';
    $w('#searchSection').expand();
  });
});

function showResults(items) {
  $w('#searchSection').collapse();
  $w('#resultsSection').expand();

  $w('#resultsRepeater').data = items.map(item => ({
    _id: item._id,
    partyName: item.title,
    rsvpStatus: item.rsvpStatus || ''
  }));
}

function submitAllRsvps() {
  let pendingUpdates = [];

  $w('#resultsRepeater').forEachItem(($item, itemData) => {
    const attending = $item('#attendingRadio').value === 'Yes';
    const original = searchResults.find(r => r._id === itemData._id);
    pendingUpdates.push({
      ...original,
      rsvpStatus: attending ? 'attending' : 'declined',
      rsvpDate: new Date()
    });
  });

  $w('#submitBtn').disable();

  Promise.all(pendingUpdates.map(item => wixData.update('Import1', item)))
    .then(() => {
      const attendingNames = pendingUpdates
        .filter(i => i.rsvpStatus === 'attending')
        .map(i => i.title);
      const decliningNames = pendingUpdates
        .filter(i => i.rsvpStatus === 'declined')
        .map(i => i.title);

      let summary = '';
      if (attendingNames.length > 0) summary += `Attending: ${attendingNames.join(', ')}. `;
      if (decliningNames.length > 0) summary += `Not attending: ${decliningNames.join(', ')}.`;

      $w('#confirmText').text = summary;
      $w('#resultsSection').collapse();
      $w('#confirmSection').expand();
    })
    .catch(err => {
      $w('#submitBtn').enable();
      console.error('RSVP submission failed:', err);
    });
}
