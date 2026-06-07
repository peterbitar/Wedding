import wixData from 'wix-data';

let familyResults = [];

$w.onReady(function () {
  $w('#pickRepeater').onItemReady(($item, itemData) => {
    $item('#pickName').text = itemData.title;
    $item('#pickBtn').onClick(() => {
      loadFamily(itemData.partyName);
    });
  });

  $w('#rsvpRepeater').onItemReady(($item, itemData) => {
    $item('#memberName').text = itemData.title;
    $item('#dropdownattending').value = itemData.rsvpStatus || '';
  });

  $w('#searchBtn').onClick(() => {
    const query = $w('#searchInput').value.trim().toUpperCase();
    if (!query) return;
    $w('#noResultsText').hide();
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
          $w('#noResultsText').show();
          return;
        }
        $w('#noResultsText').hide();

        if (results.items.length === 1) {
          loadFamily(results.items[0].partyName);
        } else {
          $w('#searchSection').hide();
          $w('#pickSection').show();
          $w('#pickRepeater').data = results.items.map(item => ({
            _id: item._id,
            title: item.title,
            partyName: item.partyName
          }));
        }
      })
      .catch(err => {
        clearTimeout(timeout);
        $w('#searchBtn').enable();
        $w('#noResultsText').show();
        console.error('Search failed:', err);
      });
  });

  $w('#submitBtn').onClick(() => {
    submitAllRsvps();
  });

  $w('#backToSearchBtn').onClick(() => {
    $w('#pickSection').hide();
    $w('#rsvpSection').hide();
    $w('#noResultsText').hide();
    $w('#searchInput').value = '';
    $w('#searchSection').show();
  });

  $w('#backToPickBtn').onClick(() => {
    $w('#rsvpSection').hide();
    $w('#pickSection').show();
  });
});

function loadFamily(partyName) {
  console.log('Loading family for partyName:', partyName);
  wixData.query('Import1')
    .eq('partyName', partyName)
    .find()
    .then(results => {
      familyResults = results.items;
      $w('#pickSection').hide();
      $w('#searchSection').hide();
      $w('#rsvpRepeater').data = results.items.map(item => ({
        _id: item._id,
        title: item.title,
        rsvpStatus: item.rsvpStatus || ''
      }));
      $w('#rsvpSection').show();
    })
    .catch(err => {
      console.error('Failed to load family:', err);
    });
}

function submitAllRsvps() {
  let pendingUpdates = [];

  $w('#rsvpRepeater').forEachItem(($item, itemData) => {
    const value = $item('#dropdownattending').value;
    console.log('Dropdown value for', itemData.title, ':', JSON.stringify(value));
    const original = familyResults.find(r => r._id === itemData._id);
    pendingUpdates.push({
      ...original,
      rsvpStatus: value || 'declined',
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
        .filter(i => i.rsvpStatus === 'not attending')
        .map(i => i.title);

      let summary = '';
      if (attendingNames.length > 0) summary += `Attending: ${attendingNames.join(', ')}. `;
      if (decliningNames.length > 0) summary += `Not attending: ${decliningNames.join(', ')}.`;
      if (!summary) summary = 'RSVP submitted!';

      $w('#confirmText').text = summary;
      $w('#rsvpSection').hide();
      $w('#confirmSection').show();
    })
    .catch(err => {
      $w('#submitBtn').enable();
      console.error('RSVP submission failed:', err);
    });
}
