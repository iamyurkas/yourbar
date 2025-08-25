import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import HeaderWithSearch from '../../components/HeaderWithSearch';
import TopTabBar from '../../components/TopTabBar';
import PlaceholderScreen from '../../components/PlaceholderScreen';
import TagFilterMenu from '../../components/TagFilterMenu';
import { BUILTIN_INGREDIENT_TAGS } from '../../constants/ingredientTags';
import { getAllTags } from '../../storage/ingredientTagsStorage';
import useTabsOnTop from '../../hooks/useTabsOnTop';
import { useTabMemory } from '../../context/TabMemoryContext';

export default function AllIngredientsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const tabsOnTop = useTabsOnTop();
  const isFocused = useIsFocused();
  const { setTab } = useTabMemory();

  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const custom = await getAllTags();
      if (!cancelled) {
        setAvailableTags([...BUILTIN_INGREDIENT_TAGS, ...custom]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isFocused) setTab('ingredients', 'All');
  }, [isFocused, setTab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <HeaderWithSearch
        searchValue={search}
        setSearchValue={setSearch}
        filterComponent={
          <TagFilterMenu
            tags={availableTags}
            selected={selectedTagIds}
            setSelected={setSelectedTagIds}
          />
        }
      />
      {tabsOnTop ? <TopTabBar navigation={navigation} theme={theme} /> : null}
      <PlaceholderScreen title="All ingredients" />
    </View>
  );
}

