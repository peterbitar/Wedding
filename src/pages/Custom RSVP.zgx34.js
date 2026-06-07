import wixData from 'wix-data';

let selectedInvitation = null;
let searchResults = [];

$w.onReady(function () {
  $w('#searchSection').expand();
  $w('#resultsSection').collapse();
  $w('#rsvpSection').collapse();
  $w('#confirmSection').collapse();
  $w('#noResultsText').collapse();

  $w('#resultsRepeater').onItemReady(($item, itemData) => {
    $item('#resultName').text = itemData.partyName;
    $item('#selectBtn').onClick(() => {
      selectedInvitation = searchResults.find(i => i._id === itemData._id);
      showRsvpForm();
    });
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
    submitRsvp();
  });

  $w('#backToSearchBtn').onClick(() => {
    $w('#resultsSection').collapse();
    $w('#noResultsText').collapse();
    $w('#searchInput').value = '';
    $w('#searchSection').expand();
  });

  $w('#backToResultsBtn').onClick(() => {
    $w('#rsvpSection').collapse();
    $w('#resultsSection').expand();
  });
});

function showResults(items) {
  $w('#searchSection').collapse();
  $w('#resultsSection').expand();

  $w('#resultsRepeater').data = items.map(item => ({
    _id: item._id,
    partyName: item.title
  }));
}

function showRsvpForm() {
  $w('#partyNameText').text = selectedInvitation.title;
  $w('#guestsInput').max = selectedInvitation.maxGuests;
  $w('#resultsSection').collapse();
  $w('#rsvpSection').expand();
}

function submitRsvp() {
  if (!$w('#attendingRadio').value || ($w('#attendingRadio').value !== 'Yes' && $w('#attendingRadio').value !== 'No')) {
    $w('#submitErrorText').show();
    return;
  }
  $w('#submitErrorText').hide();

  const attending = $w('#attendingRadio').value === 'Yes';

  const updatedItem = {
    ...selectedInvitation,
    rsvpStatus: attending ? 'attending' : 'declined',
    guestsAttending: attending ? Number($w('#guestsInput').value) : 0,
    dietaryNotes: $w('#dietaryInput').value,
    message: $w('#messageInput').value,
    rsvpDate: new Date()
  };

  wixData.update('Import1', updatedItem)
    .then(() => {
      const summary = attending
        ? `See you there! 🎉 ${updatedItem.guestsAttending} guest(s) attending.`
        : `Sorry you can't make it. We'll miss you!`;

      $w('#confirmText').text = summary;
      $w('#rsvpSection').collapse();
      $w('#confirmSection').expand();
    })
    .catch(err => {
      console.error('RSVP submission failed:', err);
    });
}